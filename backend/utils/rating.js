const mongoose = require("mongoose");
const Review = require("../models/Review");
const User = require("../models/User");

// Recomputes a provider's average rating and review count from the reviews collection.
const updateProviderRating = async (providerId) => {
  const [stats] = await Review.aggregate([
    { $match: { provider: new mongoose.Types.ObjectId(String(providerId)) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  await User.findByIdAndUpdate(providerId, {
    rating: stats ? Number(stats.avg.toFixed(1)) : 0,
    totalReviews: stats ? stats.count : 0,
  });
};

module.exports = { updateProviderRating };
