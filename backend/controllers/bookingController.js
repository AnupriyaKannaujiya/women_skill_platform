const handleError = require("../utils/handleError");
const Booking = require("../models/Booking");
const User = require("../models/User");
const Review = require("../models/Review");
const mongoose = require("mongoose");
const { expireStalePendingBookings, overdueFilter } = require("../utils/bookingMaintenance");
const { notify, formatWhen } = require("../utils/notify");

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

    const booking = await Booking.create({
      customer: req.user.id,
      provider,
      service: String(service).trim(),
      bookingDate: when,
      address: String(address).trim(),
      message: message ? String(message).trim() : undefined,
    });

    // Not awaited: the customer should not wait for the provider's email to go out.
    notify({
      to: providerUser,
      type: "booking_new",
      title: `New booking request from ${req.user.name}`,
      body: `${req.user.name} wants ${booking.service} on ${formatWhen(booking.bookingDate)}. Accept or decline it before that time, or it will expire.`,
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
      .populate("provider", "name city phone whatsapp photo")
      .sort({ createdAt: -1 })
      .lean();

    // The provider's phone/WhatsApp is shared only once she has accepted the request.
    // Populated providers can be the same object across bookings, so copy before trimming.
    for (const booking of bookings) {
      if (booking.provider && !["accepted", "completed"].includes(booking.status)) {
        const { phone, whatsapp, ...rest } = booking.provider; // eslint-disable-line no-unused-vars
        booking.provider = rest;
      }
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
      .populate("customer", "name phone whatsapp")
      .sort({ createdAt: -1 });

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
        body: `${providerName} marked your ${booking.service} booking as completed. Please leave a review — it helps other customers.`,
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

module.exports = {
  createBooking,
  getMyBookings,
  getProviderBookings,
  updateBookingStatus,
  cancelBooking,
  getProviderDashboard,
  getCustomerDashboard,
};
