const User = require("../models/User");
const Review = require("../models/Review");

const searchUsers = async (req, res) => {
  try {
    const {
      skill,
      city,
      area,
      minPrice,
      maxPrice,
      experience,
      rating,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    let filter = {
      isBlocked: false,
      role: "provider",
    };

    if (skill) {
      filter.skill = {
        $regex: skill,
        $options: "i",
      };
    }

    if (city) {
      filter.city = {
        $regex: city,
        $options: "i",
      };
    }

    if (area) {
      filter.area = {
        $regex: area,
        $options: "i",
      };
    }

    if (minPrice || maxPrice) {
      filter.price = {};

      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }

      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    if (experience) {
      filter.experience = {
        $gte: Number(experience),
      };
    }

    if (rating) {
      filter.rating = {
        $gte: Number(rating),
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const totalUsers = await User.countDocuments(filter);

    let sortOption = {};

    if (sort === "priceLow") {
      sortOption.price = 1;
    }

    if (sort === "priceHigh") {
      sortOption.price = -1;
    }

    if (sort === "ratingHigh") {
      sortOption.rating = -1;
    }

    const users = await User.find(filter)
      .select("-password")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total: totalUsers,
      currentPage: Number(page),
      totalPages: Math.ceil(totalUsers / Number(limit)),
      limit: Number(limit),
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
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
    res.status(500).json({
      message: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
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
    res.status(500).json({
      message: error.message,
    });
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
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  searchUsers,
  getAllUsers,
  getUserById,
  getMyProfile,
};
