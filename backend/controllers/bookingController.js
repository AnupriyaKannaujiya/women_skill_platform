const Booking = require("../models/Booking");
const User = require("../models/User");
const Review = require("../models/Review");

const createBooking = async (req, res) => {
  try {
    const { provider, service, bookingDate, address, message } = req.body;

    const providerUser = await User.findById(provider);

    if (!providerUser) {
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

    const booking = await Booking.create({
      customer: req.user.id,
      provider,
      service,
      bookingDate,
      address,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Booking Request Sent",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      customer: req.user.id,
    })
      .populate("provider", "name city phone whatsapp photo")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: bookings.length,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getProviderBookings = async (req, res) => {
  try {
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
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["accepted", "rejected", "completed"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

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

    booking.status = status;

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking Updated",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getProviderDashboard = async (req, res) => {
  try {
    const providerId = req.user.id;

    const totalBookings = await Booking.countDocuments({
      provider: providerId,
    });

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
        totalReviews,
        rating: req.user.rating,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getCustomerDashboard = async (req, res) => {
  try {
    const customerId = req.user.id;

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
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getProviderBookings,
  updateBookingStatus,
  getProviderDashboard,
  getCustomerDashboard,
};
