const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const User = require("../models/User");
const CustomerRating = require("../models/CustomerRating");
const CustomerReport = require("../models/CustomerReport");
const handleError = require("../utils/handleError");
const { notify, formatWhen } = require("../utils/notify");
const { updateCustomerRating } = require("../utils/customerSafety");

const REASON_LABELS = {
  harassment: "Harassment or inappropriate behaviour",
  unsafe: "Made her feel unsafe",
  abusive: "Rude or abusive",
  no_show: "Did not show up / not at the address",
  payment: "Did not pay / payment dispute",
  fake: "Fake booking or details",
  other: "Something else",
};

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// ---------- Rating a customer ----------

const rateCustomer = async (req, res) => {
  try {
    const { bookingId, rating, note } = req.body;
    const value = Number(rating);
    if (!mongoose.isValidObjectId(bookingId)) return fail(res, 400, "Choose a booking to rate");
    if (!Number.isInteger(value) || value < 1 || value > 5) return fail(res, 400, "Give 1 to 5 stars");

    const booking = await Booking.findOne({ _id: bookingId, provider: req.user._id });
    if (!booking) return fail(res, 404, "Booking not found");
    if (booking.status !== "completed") return fail(res, 400, "You can rate a customer after the work is completed");
    if (await CustomerRating.exists({ booking: booking._id })) {
      return fail(res, 409, "You have already rated this booking");
    }

    const tags = [...new Set((Array.isArray(req.body.tags) ? req.body.tags : []).map(String))]
      .filter((tag) => CustomerRating.TAGS.includes(tag))
      .slice(0, 6);

    const saved = await CustomerRating.create({
      provider: req.user._id,
      customer: booking.customer,
      booking: booking._id,
      rating: value,
      tags,
      note: String(note || "").trim().slice(0, 500) || undefined,
    });
    await updateCustomerRating(booking.customer);

    res.status(201).json({ success: true, message: "Thanks — your rating helps other providers stay safe.", rating: saved });
  } catch (error) {
    handleError(res, error);
  }
};

// Which of her completed bookings she has already rated (for the dashboard buttons).
const myRatings = async (req, res) => {
  try {
    const ratings = await CustomerRating.find({ provider: req.user._id }).select("booking rating tags").lean();
    res.status(200).json({ success: true, ratings });
  } catch (error) {
    handleError(res, error);
  }
};

// ---------- Reporting a customer ----------

const reportCustomer = async (req, res) => {
  try {
    const { customerId, bookingId, reason } = req.body;
    const details = String(req.body.details || "").trim().slice(0, 1500);

    if (!mongoose.isValidObjectId(customerId)) return fail(res, 400, "Choose who you are reporting");
    if (!CustomerReport.REASONS.includes(reason)) return fail(res, 400, "Choose a reason");
    if (details.length < 10) return fail(res, 400, "Please describe what happened (at least a sentence)");

    // She can only report customers she has actually had a booking with.
    const bookingQuery = { provider: req.user._id, customer: customerId };
    if (bookingId) {
      if (!mongoose.isValidObjectId(bookingId)) return fail(res, 400, "That booking is not valid");
      bookingQuery._id = bookingId;
    }
    const booking = await Booking.findOne(bookingQuery).sort({ bookingDate: -1 });
    if (!booking) return fail(res, 404, "You can only report customers who have booked you");

    const customer = await User.findOne({ _id: customerId, role: "customer" }).select("name email phone");
    if (!customer) return fail(res, 404, "Customer not found");

    if (await CustomerReport.exists({ reporter: req.user._id, customer: customerId, status: "open" })) {
      return fail(res, 409, "You already have an open report about this customer. The team is looking into it.");
    }

    const serious = CustomerReport.SERIOUS.includes(reason);
    const report = await CustomerReport.create({
      reporter: req.user._id,
      customer: customerId,
      booking: booking._id,
      reason,
      details,
      serious,
    });

    let blocked = false;
    if (req.body.block) {
      await User.updateOne({ _id: req.user._id }, { $addToSet: { blockedCustomers: customer._id } });
      blocked = true;
    }

    const admins = await User.find({ role: "admin", isBlocked: { $ne: true } }).select("_id");
    await Promise.all(
      admins.map((admin) =>
        notify({
          to: admin._id,
          type: "customer_report",
          title: `${serious ? "⚠️ Serious report" : "New report"}: ${req.user.name} reported ${customer.name}`,
          body: `${REASON_LABELS[reason]}. Booking: ${booking.service} on ${formatWhen(booking.bookingDate)}. "${details.slice(0, 200)}"`,
          link: "/admin/reports",
          booking: booking._id,
          // Safety reports always reach the team by email too.
          email: serious,
          forceEmail: serious,
        }),
      ),
    );

    res.status(201).json({
      success: true,
      message: `Report sent to the Women Skill team.${blocked ? ` ${customer.name} can no longer book you.` : ""}`,
      report: { _id: report._id, status: report.status, serious },
      blocked,
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Her own reports and what happened to them.
const myReports = async (req, res) => {
  try {
    const reports = await CustomerReport.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("customer", "name")
      .select("customer booking reason status action createdAt resolvedAt")
      .lean();
    res.status(200).json({ success: true, reports });
  } catch (error) {
    handleError(res, error);
  }
};

// ---------- Blocking ----------

const blockCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return fail(res, 400, "Customer not found");
    const hadBooking = await Booking.exists({ provider: req.user._id, customer: id });
    if (!hadBooking) return fail(res, 404, "You can only block customers who have booked you");
    await User.updateOne({ _id: req.user._id }, { $addToSet: { blockedCustomers: id } });
    res.status(200).json({ success: true, message: "Blocked. They can no longer book you, and they are not told." });
  } catch (error) {
    handleError(res, error);
  }
};

const unblockCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return fail(res, 400, "Customer not found");
    await User.updateOne({ _id: req.user._id }, { $pull: { blockedCustomers: id } });
    res.status(200).json({ success: true, message: "Unblocked." });
  } catch (error) {
    handleError(res, error);
  }
};

const listBlocked = async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .select("blockedCustomers")
      .populate("blockedCustomers", "name city");
    res.status(200).json({ success: true, customers: me?.blockedCustomers || [] });
  } catch (error) {
    handleError(res, error);
  }
};

// ---------- Admin: reviewing reports ----------

const listReports = async (req, res) => {
  try {
    const status = ["open", "resolved", "dismissed"].includes(req.query.status) ? req.query.status : "open";
    const reports = await CustomerReport.find({ status })
      .sort(status === "open" ? { serious: -1, createdAt: 1 } : { resolvedAt: -1 })
      .limit(200)
      .populate("reporter", "name phone city")
      .populate("customer", "name email phone isBlocked isVerified customerRating customerRatingCount")
      .populate("booking", "service serviceMode address bookingDate status")
      .populate("resolvedBy", "name")
      .lean();

    // How many different providers have reported each customer (all statuses), for context.
    const customerIds = [...new Set(reports.map((r) => String(r.customer?._id)).filter(Boolean))];
    const totals = await CustomerReport.aggregate([
      { $match: { customer: { $in: customerIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: "$customer", reporters: { $addToSet: "$reporter" }, total: { $sum: 1 } } },
    ]);
    const byCustomer = Object.fromEntries(totals.map((t) => [String(t._id), { reporters: t.reporters.length, total: t.total }]));

    const counts = {};
    for (const key of ["open", "resolved", "dismissed"]) counts[key] = await CustomerReport.countDocuments({ status: key });

    res.status(200).json({
      success: true,
      status,
      counts,
      reasons: REASON_LABELS,
      reports: reports.map((r) => ({ ...r, history: byCustomer[String(r.customer?._id)] || { reporters: 1, total: 1 } })),
    });
  } catch (error) {
    handleError(res, error);
  }
};

const resolveReport = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Report not found");
    const { decision } = req.body; // dismiss | warn | block | resolve
    const adminNote = String(req.body.adminNote || "").trim().slice(0, 500);
    if (!["dismiss", "warn", "block", "resolve"].includes(decision)) return fail(res, 400, "Choose what to do");
    if (decision === "dismiss" && !adminNote) {
      return fail(res, 400, "Add a short note on why it is dismissed");
    }

    const report = await CustomerReport.findById(req.params.id).populate("customer", "name role isBlocked");
    if (!report) return fail(res, 404, "Report not found");
    if (report.status !== "open") return fail(res, 400, "This report is already closed");

    report.status = decision === "dismiss" ? "dismissed" : "resolved";
    report.action = decision === "warn" ? "warned" : decision === "block" ? "blocked" : "none";
    report.adminNote = adminNote || undefined;
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    await report.save();

    if (decision === "block" && report.customer?.role === "customer") {
      await User.updateOne({ _id: report.customer._id }, { isBlocked: true });
    }

    if (decision === "warn") {
      notify({
        to: report.customer._id,
        type: "account_warning",
        title: "A warning about your Women Skill account",
        body:
          "We received a complaint from a provider about a recent booking. Women Skill providers must be treated with respect and safety. " +
          `${adminNote ? `Note from the team: ${adminNote}. ` : ""}Further complaints may lead to your account being blocked.`,
        link: "/customer/dashboard",
        forceEmail: true,
      });
    }

    const outcome = {
      dismiss: "The team looked into it and did not take action this time.",
      resolve: "The team has looked into it and closed it.",
      warn: "The team has sent the customer a formal warning.",
      block: "The team has blocked the customer from Women Skill.",
    }[decision];
    notify({
      to: report.reporter,
      type: "report_update",
      title: "Update on your report",
      body: `About ${report.customer?.name || "the customer"}: ${outcome}${adminNote && decision !== "warn" ? ` Note: ${adminNote}` : ""}`,
      link: "/provider/safety",
    });

    res.status(200).json({ success: true, message: `Report ${report.status}`, report });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  REASON_LABELS,
  rateCustomer,
  myRatings,
  reportCustomer,
  myReports,
  blockCustomer,
  unblockCustomer,
  listBlocked,
  listReports,
  resolveReport,
};
