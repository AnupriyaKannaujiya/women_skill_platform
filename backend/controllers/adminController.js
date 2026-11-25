const handleError = require("../utils/handleError");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const { publicIdFromUrl, destroyImage } = require("../utils/cloudinaryHelpers");
const { updateProviderRating } = require("../utils/rating");
const { SELF_HIDDEN_FIELDS } = require("../utils/publicUser");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const ContactMessage = require("../models/ContactMessage");
const Notification = require("../models/Notification");
const SosAlert = require("../models/SosAlert");
const CustomerReport = require("../models/CustomerReport");
const CustomerRating = require("../models/CustomerRating");
const { expireStalePendingBookings, overdueFilter } = require("../utils/bookingMaintenance");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select(SELF_HIDDEN_FIELDS);

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

    // A pending ID photo is stored privately and must not be left behind.
    const idDocument = user.verification?.document?.public_id;
    if (idDocument) {
      await cloudinary.uploader
        .destroy(idDocument, { type: "private", resource_type: "image" })
        .catch((error) => console.error("Could not delete ID document:", error.message));
    }

    // Providers this user reviewed need their rating recalculated after the reviews go.
    const reviewedProviders = await Review.distinct("provider", { reviewer: user._id });

    await Booking.deleteMany({
      $or: [{ customer: user._id }, { provider: user._id }],
    });

    await Review.deleteMany({
      $or: [{ reviewer: user._id }, { provider: user._id }],
    });

    await Notification.deleteMany({ user: user._id });

    // Ratings and reports given by or about this person.
    await CustomerRating.deleteMany({ $or: [{ provider: user._id }, { customer: user._id }] });
    await CustomerReport.deleteMany({ $or: [{ reporter: user._id }, { customer: user._id }] });
    await User.updateMany({ blockedCustomers: user._id }, { $pull: { blockedCustomers: user._id } });
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

    // All counts run at once; one at a time made the overview take several seconds.
    const [
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
      pendingVerifications,
      verifiedProviders,
      activeSos,
      openReports,
      seriousReports,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "provider" }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "admin" }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: "accepted" }),
      Booking.countDocuments({ status: "completed" }),
      Booking.countDocuments({ status: "rejected" }),
      Booking.countDocuments({ status: "cancelled" }),
      Booking.countDocuments({ status: "expired" }),
      Booking.countDocuments(overdueFilter()),
      Review.countDocuments(),
      ContactMessage.countDocuments({ isRead: false }),
      User.countDocuments({ role: { $in: ["provider", "customer"] }, "verification.status": "pending" }),
      User.countDocuments({ role: "provider", isVerified: true }),
      SosAlert.countDocuments({ status: "active" }),
      CustomerReport.countDocuments({ status: "open" }),
      CustomerReport.countDocuments({ status: "open", serious: true }),
    ]);

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
        pendingVerifications,
        verifiedProviders,
        activeSos,
        openReports,
        seriousReports,
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
    const user = await User.findById(req.params.id).select(SELF_HIDDEN_FIELDS);

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
