const Review = require("../models/Review");
const Booking = require("../models/Booking");
const User = require("../models/User");

const updateProviderRating = async (providerId) => {
  const reviews = await Review.find({
    provider: providerId,
  });

  const totalReviews = reviews.length;

  const totalRating = reviews.reduce((sum, review) => {
    return sum + review.rating;
  }, 0);

  const averageRating = totalReviews
    ? totalRating / totalReviews
    : 0;

  await User.findByIdAndUpdate(providerId, {
    rating: Number(averageRating.toFixed(1)),
    totalReviews,
  });
};

const addReview = async (req, res) => {
  try {
    const { provider, rating, comment } = req.body;

    const booking = await Booking.findOne({
      customer: req.user.id,
      provider,
      status: "completed",
    });

    if (!booking) {
      return res.status(400).json({
        message: "You can review only after completing a booking",
      });
    }
    const existingReview = await Review.findOne({
      reviewer: req.user.id,
      provider,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this provider",
      });
    }
    const review = await Review.create({
      reviewer: req.user.id,
      provider,
      rating,
      comment,
    });

    await updateProviderRating(provider);

    res.status(201).json({
      success: true,
      message: "Review Added Successfully",
      review,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getProviderReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      provider: req.params.providerId,
    })
      .populate("reviewer", "name photo")
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

const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    if (review.reviewer.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;

    await review.save();

    await updateProviderRating(review.provider);

    res.status(200).json({
      success: true,
      message: "Review Updated Successfully",
      review,
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
        message: "Review not found",
      });
    }

    if (review.reviewer.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    await review.deleteOne();

    await updateProviderRating(review.provider);

    res.status(200).json({
      success: true,
      message: "Review Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  addReview,
  getProviderReviews,
  updateReview,
  deleteReview,
};
