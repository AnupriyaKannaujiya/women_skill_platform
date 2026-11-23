const handleError = require("../utils/handleError");
const mongoose = require("mongoose");
const User = require("../models/User");
const Review = require("../models/Review");
const { PUBLIC_HIDDEN_FIELDS } = require("../utils/publicUser");

// User input goes into a RegExp, so special characters must be escaped.
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsText = (value) => ({
  $regex: escapeRegex(String(value).trim().slice(0, 60)),
  $options: "i",
});

// Returns a finite number, or undefined for "", "abc", NaN, etc.
const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const SORTS = {
  priceLow: { price: 1, _id: 1 },
  priceHigh: { price: -1, _id: 1 },
  ratingHigh: { rating: -1, totalReviews: -1, _id: 1 },
};

const searchUsers = async (req, res) => {
  try {
    const { skill, city, area, minPrice, maxPrice, experience, rating, sort } = req.query;

    const filter = {
      isBlocked: false,
      role: "provider",
    };

    if (skill) filter.skill = containsText(skill);
    if (city) filter.city = containsText(city);
    if (area) filter.area = containsText(area);

    const min = toNumber(minPrice);
    const max = toNumber(maxPrice);
    if (min !== undefined || max !== undefined) {
      filter.price = {};
      if (min !== undefined) filter.price.$gte = min;
      if (max !== undefined) filter.price.$lte = max;
    }

    const minExperience = toNumber(experience);
    if (minExperience !== undefined) filter.experience = { $gte: minExperience };

    const minRating = toNumber(rating);
    if (minRating !== undefined) filter.rating = { $gte: minRating };

    const limit = clamp(Math.trunc(toNumber(req.query.limit) ?? 10), 1, 50);
    const page = Math.max(Math.trunc(toNumber(req.query.page) ?? 1), 1);
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments(filter);

    const users = await User.find(filter)
      .select(PUBLIC_HIDDEN_FIELDS)
      .sort(SORTS[sort] || { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total: totalUsers,
      currentPage: page,
      totalPages: Math.max(Math.ceil(totalUsers / limit), 1),
      limit,
      users,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isBlocked: false }).select("-password");

    res.status(200).json({
      success: true,
      total: users.length,
      users,
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Public profile page. Only active providers are public; customers and
// admins are not browsable, and email is never exposed.
const getUserById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      role: "provider",
      isBlocked: false,
    }).select(PUBLIC_HIDDEN_FIELDS);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const reviews = await Review.find({
      provider: req.params.id,
    })
      .populate("reviewer", "name photo")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      user,
      reviews,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  searchUsers,
  getAllUsers,
  getUserById,
  getMyProfile,
};
