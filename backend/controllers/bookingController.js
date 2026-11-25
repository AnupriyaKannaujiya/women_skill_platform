const handleError = require("../utils/handleError");
const Booking = require("../models/Booking");
const User = require("../models/User");
const Review = require("../models/Review");
const mongoose = require("mongoose");
const { expireStalePendingBookings, overdueFilter } = require("../utils/bookingMaintenance");
const { notify, formatWhen, rupees } = require("../utils/notify");
const { quote, isLocation } = require("../utils/pricing");
const { checkSlot } = require("../utils/availability");
const { safetySummaries } = require("../utils/customerSafety");

const HOUR_MS = 60 * 60 * 1000;
// She can check in from an hour before the start time.
const CHECK_IN_EARLY_MS = HOUR_MS;

// Which status a provider may move a booking to from its current status.
// Anything not listed here (e.g. pending -> completed, completed -> rejected) is refused.
const ALLOWED_TRANSITIONS = {
  pending: ["accepted", "rejected"],
  accepted: ["completed", "cancelled"],
  rejected: [],
  completed: [],
  cancelled: [],
  expired: [],
};

// Lists are read often; closing stale requests first keeps every screen up to date
// even between the background runs.
const refreshStale = () => expireStalePendingBookings().catch(() => 0);

const withArticle = (word) => `${/^[aeiou]/i.test(word) ? "An" : "A"} ${word}`;

const createBooking = async (req, res) => {
  try {
    const { provider, service, bookingDate, address, message } = req.body;

    if (!mongoose.isValidObjectId(provider)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider",
      });
    }

    const when = new Date(bookingDate);

    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking date",
      });
    }

    // Small grace window so a time picked "now" in the browser is not rejected.
    if (when.getTime() < Date.now() - 5 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: "Booking date must be in the future",
      });
    }

    const providerUser = await User.findById(provider);

    if (!providerUser || providerUser.isBlocked) {
      return res.status(404).json({
        message: "Provider not found",
      });
    }

    if (providerUser.role !== "provider") {
      return res.status(400).json({
        message: "Selected user is not a provider",
      });
    }

    if (providerUser._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        message: "You cannot book yourself",
      });
    }

    // One open request per provider at a time stops accidental double submits and spam.
    const openRequest = await Booking.exists({
      customer: req.user.id,
      provider,
      status: "pending",
    });

    if (openRequest) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a pending request with her. Wait for her reply or cancel it from My bookings.",
      });
    }

    // Safety: she knows who she is dealing with.
    if (!String(req.user.phone || "").trim()) {
      return res.status(400).json({
        success: false,
        code: "PHONE_REQUIRED",
        message: "Add your phone number in your profile before booking, so she can reach you.",
      });
    }
    // A customer she blocked is turned away without being told why.
    if ((providerUser.blockedCustomers || []).some((id) => String(id) === String(req.user._id))) {
      return res.status(403).json({
        success: false,
        code: "PROVIDER_UNAVAILABLE",
        message: "This provider is not taking bookings from your account. Please choose someone else.",
      });
    }
    if (providerUser.requireVerifiedCustomers && !req.user.isVerified) {
      return res.status(403).json({
        success: false,
        code: "VERIFICATION_REQUIRED",
        message: "She only accepts bookings from customers with a verified ID. Verify your ID from your account, then book again.",
      });
    }

    // Where, which package and what it costs (worked out on the server).
    const serviceMode = req.body.serviceMode || "at_customer";
    const priced = quote(providerUser, {
      serviceMode,
      packageId: req.body.packageId || "standard",
      location: req.body.location,
    });
    if (priced.error) {
      return res.status(400).json({ success: false, message: priced.error });
    }

    if (serviceMode === "at_customer" && !String(address || "").trim()) {
      return res.status(400).json({ success: false, message: "Add the address where she should come" });
    }

    // The time must fit her working hours, days off and other bookings.
    const hours = Number(priced.pkg.hours) || 2;
    const slotError = await checkSlot(providerUser, when, hours, Boolean(priced.pkg.overnight));
    if (slotError) {
      return res.status(409).json({ success: false, code: "SLOT_UNAVAILABLE", message: slotError });
    }

    const booking = await Booking.create({
      customer: req.user.id,
      provider,
      service: String(service).trim(),
      bookingDate: when,
      endDate: new Date(when.getTime() + hours * 60 * 60 * 1000),
      serviceMode,
      package: {
        label: priced.pkg.label,
        hours,
        price: priced.pkg.price,
        overnight: Boolean(priced.pkg.overnight),
      },
      address: serviceMode === "at_customer" ? String(address).trim() : "At her place",
      customerLocation: serviceMode === "at_customer" && isLocation(req.body.location)
        ? { lat: Number(req.body.location.lat), lng: Number(req.body.location.lng) }
        : undefined,
      distanceKm: priced.distanceKm ?? undefined,
      charges: priced.charges,
      message: message ? String(message).trim() : undefined,
    });

    // Not awaited: the customer should not wait for the provider's email to go out.
    notify({
      to: providerUser,
      type: "booking_new",
      title: `New booking request from ${req.user.name}`,
      body: `${req.user.name}${req.user.isVerified ? " (✓ verified customer)" : " (ID not verified)"} wants ${booking.service} — ${booking.package.label}, ${serviceMode === "at_customer" ? `at their place${booking.distanceKm !== undefined ? ` about ${booking.distanceKm} km away` : ""}` : "at your place"} — on ${formatWhen(booking.bookingDate)}. Total ${rupees(booking.charges.total)}. Accept or decline it before that time, or it will expire.`,
      link: "/provider/dashboard",
      booking: booking._id,
    });

    res.status(201).json({
      success: true,
      message: "Booking Request Sent",
      booking,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getMyBookings = async (req, res) => {
  try {
    await refreshStale();

    const bookings = await Booking.find({
      customer: req.user.id,
    })
      .populate("provider", "name city phone whatsapp photo providerAddress isVerified")
      .sort({ createdAt: -1 })
      .lean();

    // Her phone, WhatsApp and (for visits to her place) address are shared only once she
    // has accepted. Populated providers can be the same object across bookings, so copy.
    for (const booking of bookings) {
      if (!booking.provider) continue;
      const shared = ["accepted", "completed"].includes(booking.status);
      const { phone, whatsapp, providerAddress, ...rest } = booking.provider;
      booking.provider = {
        ...rest,
        ...(shared ? { phone, whatsapp } : {}),
        ...(shared && booking.serviceMode === "at_provider" ? { providerAddress } : {}),
      };
    }

    res.status(200).json({
      success: true,
      total: bookings.length,
      bookings,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getProviderBookings = async (req, res) => {
  try {
    await refreshStale();

    const bookings = await Booking.find({
      provider: req.user.id,
    })
      .populate("customer", "name phone whatsapp isVerified")
      .sort({ createdAt: -1 })
      .lean();

    // What other providers think of each customer: rating and how many reported them.
    const summaries = await safetySummaries(bookings.map((b) => b.customer?._id));
    for (const booking of bookings) {
      if (booking.customer) booking.customer.safety = summaries[String(booking.customer._id)];
    }

    res.status(200).json({
      success: true,
      total: bookings.length,
      bookings,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["accepted", "rejected", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await refreshStale();

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.provider.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    if (!ALLOWED_TRANSITIONS[booking.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `${withArticle(booking.status)} booking cannot be marked ${status}`,
      });
    }

    // Work cannot be finished before the day it was booked for. This also stops
    // accept-and-complete-instantly being used to unlock fake reviews.
    if (status === "completed" && booking.bookingDate.getTime() > Date.now()) {
      return res.status(400).json({
        success: false,
        message: "This booking can be marked completed only after its booking date",
      });
    }

    if (status === "completed") {
      // Extra time beyond the package, charged at her overtime rate.
      const overtimeHours = Number(req.body.overtimeHours) || 0;
      if (overtimeHours < 0 || overtimeHours > 12 || (overtimeHours * 2) % 1 !== 0) {
        return res.status(400).json({
          success: false,
          message: "Overtime must be between 0 and 12 hours, in half hours",
        });
      }
      const rate = Number(req.user.overtimeRate) || 0;
      const base = booking.charges?.total ? booking.charges : { service: 0, travel: 0 };
      booking.overtimeHours = overtimeHours;
      booking.charges = {
        service: base.service || 0,
        travel: base.travel || 0,
        overtime: Math.round(overtimeHours * rate),
        total: (base.service || 0) + (base.travel || 0) + Math.round(overtimeHours * rate),
      };
      // Finishing the job also counts as leaving safely.
      if (booking.checkInAt && !booking.checkOutAt) booking.checkOutAt = new Date();
    }

    booking.status = status;

    if (status === "cancelled") {
      booking.cancelledBy = "provider";
      booking.cancelledAt = new Date();
    }

    await booking.save();

    // Tell the customer what changed.
    const providerName = req.user.name;
    const when = formatWhen(booking.bookingDate);
    const messages = {
      accepted: {
        title: `${providerName} accepted your booking`,
        body: `Your ${booking.service} booking for ${when} is confirmed. You can now call or WhatsApp her from My bookings.`,
      },
      rejected: {
        title: `${providerName} could not take your booking`,
        body: `Your ${booking.service} request for ${when} was declined. You can find someone else for the same time.`,
      },
      completed: {
        title: `How was ${booking.service} with ${providerName}?`,
        body: `${providerName} marked your ${booking.service} booking as completed.${booking.charges?.total ? ` Final amount: ${rupees(booking.charges.total)}${booking.overtimeHours ? ` (includes ${booking.overtimeHours} h overtime, ${rupees(booking.charges.overtime)})` : ""}.` : ""} Please leave a review — it helps other customers.`,
      },
      cancelled: {
        title: `${providerName} cancelled your booking`,
        body: `Your ${booking.service} booking for ${when} was cancelled by the provider. You can find someone else for the same time.`,
      },
    };

    notify({
      to: booking.customer,
      type: `booking_${status}`,
      ...messages[status],
      // The profile shows "Write a review" only while a review is still due.
      link: status === "completed" ? `/providers/${booking.provider}` : "/customer/dashboard",
      booking: booking._id,
    });

    res.status(200).json({
      success: true,
      message: "Booking Updated",
      booking,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getProviderDashboard = async (req, res) => {
  try {
    const providerId = req.user.id;

    await refreshStale();

    const totalBookings = await Booking.countDocuments({
      provider: providerId,
    });

    const overdueBookings = await Booking.countDocuments(overdueFilter({ provider: providerId }));

    const pendingBookings = await Booking.countDocuments({
      provider: providerId,
      status: "pending",
    });

    const acceptedBookings = await Booking.countDocuments({
      provider: providerId,
      status: "accepted",
    });

    const completedBookings = await Booking.countDocuments({
      provider: providerId,
      status: "completed",
    });

    const totalReviews = await Review.countDocuments({
      provider: providerId,
    });

    res.status(200).json({
      success: true,
      dashboard: {
        totalBookings,
        pendingBookings,
        acceptedBookings,
        completedBookings,
        overdueBookings,
        totalReviews,
        rating: req.user.rating,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getCustomerDashboard = async (req, res) => {
  try {
    const customerId = req.user.id;

    await refreshStale();

    const totalBookings = await Booking.countDocuments({
      customer: customerId,
    });

    const pendingBookings = await Booking.countDocuments({
      customer: customerId,
      status: "pending",
    });

    const acceptedBookings = await Booking.countDocuments({
      customer: customerId,
      status: "accepted",
    });

    const completedBookings = await Booking.countDocuments({
      customer: customerId,
      status: "completed",
    });

    res.status(200).json({
      success: true,
      dashboard: {
        totalBookings,
        pendingBookings,
        acceptedBookings,
        completedBookings,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

// A customer may withdraw her own request while it is still pending or accepted,
// as long as the booked time has not passed.
const cancelBooking = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking || booking.customer.toString() !== req.user.id.toString()) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (!["pending", "accepted"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `${withArticle(booking.status)} booking cannot be cancelled`,
      });
    }

    if (booking.bookingDate.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: "This booking time has already passed",
      });
    }

    booking.status = "cancelled";
    booking.cancelledBy = "customer";
    booking.cancelledAt = new Date();
    await booking.save();

    notify({
      to: booking.provider,
      type: "booking_cancelled",
      title: `${req.user.name} cancelled a booking`,
      body: `The ${booking.service} booking for ${formatWhen(booking.bookingDate)} was cancelled by the customer. That time is free again.`,
      link: "/provider/dashboard",
      booking: booking._id,
    });

    res.status(200).json({
      success: true,
      message: "Booking cancelled",
      booking,
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Safety on home visits: "I've arrived" and "I've left safely".
const checkInOut = (kind) => async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    const booking = await Booking.findOne({ _id: req.params.id, provider: req.user._id }).populate(
      "customer",
      "name",
    );
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Only accepted bookings can be checked in or out" });
    }

    if (kind === "in") {
      if (booking.checkInAt) return res.status(400).json({ success: false, message: "You already checked in" });
      if (booking.bookingDate.getTime() - Date.now() > CHECK_IN_EARLY_MS) {
        return res.status(400).json({ success: false, message: "You can check in from 1 hour before the start time" });
      }
      booking.checkInAt = new Date();
    } else {
      if (!booking.checkInAt) return res.status(400).json({ success: false, message: "Check in first" });
      if (booking.checkOutAt) return res.status(400).json({ success: false, message: "You already checked out" });
      booking.checkOutAt = new Date();
    }
    await booking.save();

    res.status(200).json({
      success: true,
      message: kind === "in" ? "Checked in. Stay safe — the SOS button is always on your screen." : "Checked out. Glad you're safe!",
      booking,
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getProviderBookings,
  updateBookingStatus,
  cancelBooking,
  checkIn: checkInOut("in"),
  checkOut: checkInOut("out"),
  getProviderDashboard,
  getCustomerDashboard,
};
