const handleError = require("../utils/handleError");
const User = require("../models/User");
const { publicIdFromUrl, destroyImage } = require("../utils/cloudinaryHelpers");
const { updateProviderRating } = require("../utils/rating");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const ContactMessage = require("../models/ContactMessage");
const { expireStalePendingBookings, overdueFilter } = require("../utils/bookingMaintenance");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      total: users.length,
      users,
    });
  } catch (error) {
    handleError(res, error);
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

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin cannot be deleted",
      });
    }

    await destroyImage(publicIdFromUrl(user.photo));

    for (const image of user.portfolio) {
      await destroyImage(image.public_id);
    }

    // Providers this user reviewed need their rating recalculated after the reviews go.
    const reviewedProviders = await Review.distinct("provider", { reviewer: user._id });

    await Booking.deleteMany({
      $or: [{ customer: user._id }, { provider: user._id }],
    });

    await Review.deleteMany({
      $or: [{ reviewer: user._id }, { provider: user._id }],
    });
    await user.deleteOne();

    for (const providerId of reviewedProviders) {
      await updateProviderRating(providerId);
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getDashboardStats = async (req, res) => {
  try {
    await expireStalePendingBookings();

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

    const rejectedBookings = await Booking.countDocuments({ status: "rejected" });

    const cancelledBookings = await Booking.countDocuments({ status: "cancelled" });

    const expiredBookings = await Booking.countDocuments({ status: "expired" });

    const overdueBookings = await Booking.countDocuments(overdueFilter());

    const totalReviews = await Review.countDocuments();

    const unreadMessages = await ContactMessage.countDocuments({ isRead: false });

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
        rejectedBookings,
        cancelledBookings,
        expiredBookings,
        overdueBookings,
        totalReviews,
        unreadMessages,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getAllBookings = async (req, res) => {
  try {
    await expireStalePendingBookings();

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
    handleError(res, error);
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
    handleError(res, error);
  }
};

const toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

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
    handleError(res, error);
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

    await updateProviderRating(review.provider);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    handleError(res, error);
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
