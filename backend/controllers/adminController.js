const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const Booking = require("../models/Booking");
const Review = require("../models/Review");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      total: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.photo) {
      const photoPublicId = user.photo
        .split("/")
        .slice(-2)
        .join("/")
        .replace(/\.[^/.]+$/, "");

      await cloudinary.uploader.destroy(photoPublicId);
    }

    for (const image of user.portfolio) {
      await cloudinary.uploader.destroy(image.public_id);
    }

    await Booking.deleteMany({
      $or: [{ customer: user._id }, { provider: user._id }],
    });

    await Review.deleteMany({
      $or: [{ reviewer: user._id }, { provider: user._id }],
    });
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalProviders = await User.countDocuments({
      role: "provider",
    });

    const totalCustomers = await User.countDocuments({
      role: "customer",
    });

    const totalAdmins = await User.countDocuments({
      role: "admin",
    });

    const totalBookings = await Booking.countDocuments();

    const pendingBookings = await Booking.countDocuments({
      status: "pending",
    });

    const acceptedBookings = await Booking.countDocuments({
      status: "accepted",
    });

    const completedBookings = await Booking.countDocuments({
      status: "completed",
    });

    const totalReviews = await Review.countDocuments();

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalProviders,
        totalCustomers,
        totalAdmins,
        totalBookings,
        pendingBookings,
        acceptedBookings,
        completedBookings,
        totalReviews,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("customer", "name email phone")
      .populate("provider", "name email phone")
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

const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("reviewer", "name email")
      .populate("provider", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: reviews.length,
      reviews,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        message: "Admin cannot be blocked",
      });
    }

    user.isBlocked = !user.isBlocked;

    await user.save();

    res.status(200).json({
      success: true,
      message: user.isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  getDashboardStats,
  toggleUserBlock,
  getAllBookings,
  getAllReviews,
  deleteReview,
};
