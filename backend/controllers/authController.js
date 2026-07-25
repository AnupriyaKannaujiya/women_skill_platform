const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      whatsapp,
      city,
      area,
      skill,
      experience,
      price,
      description,
      role,
    } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const allowedRoles = ["customer", "provider"];

    const userRole = allowedRoles.includes(role) ? role : "customer";

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      whatsapp,
      city,
      area,
      skill,
      experience,
      price,
      description,
      role: userRole,
    });

    res.status(201).json({
      success: true,
      message: "Registration Successful",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked by admin",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const safeUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      photo,
      name,
      phone,
      whatsapp,
      city,
      area,
      skill,
      experience,
      price,
      description,
    } = req.body;

    const updateData = {
      photo,
      name,
      phone,
      whatsapp,
      city,
      area,
      skill,
      experience,
      price,
      description,
    };
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile Updated Successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image",
      });
    }

    const uploadFromBuffer = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "women_skill_platform/profile_photos",
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          },
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const user = await User.findById(req.user.id);

    // if (user.photo) {
    //   const photoPublicId = user.photo
    //     .split("/")
    //     .slice(-2)
    //     .join("/")
    //     .replace(/\.[^/.]+$/, "");

    //   await cloudinary.uploader.destroy(photoPublicId);
    // }

    const result = await uploadFromBuffer();

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        photo: result.secure_url,
      },
      {
        new: true,
      },
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile photo uploaded successfully",
      photo: result.secure_url,
      user: updatedUser,
    });
  } catch (error) {
    console.error("========== FULL ERROR ==========");
    console.error(error);
    console.error("===============================");

    res.status(500).json({
      message: error.message,
    });
  }
};

const removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.photo) {
      return res.status(400).json({
        success: false,
        message: "No profile photo found",
      });
    }

    const photoPublicId = user.photo
      .split("/")
      .slice(-2)
      .join("/")
      .replace(/\.[^/.]+$/, "");

    await cloudinary.uploader.destroy(photoPublicId);

    user.photo = "";

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile photo removed successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const uploadPortfolio = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload portfolio images",
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "women_skill_platform/portfolio",
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          },
        );

        streamifier.createReadStream(file.buffer).pipe(stream);
      });

      uploadedImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }

    const user = await User.findById(req.user.id);
    user.portfolio.push(...uploadedImages);

    await user.save();

    res.status(200).json({
      success: true,
      message: "Portfolio uploaded successfully",
      portfolio: user.portfolio,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deletePortfolioImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const user = await User.findById(req.user.id);

    const image = user.portfolio.id(imageId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    await cloudinary.uploader.destroy(image.public_id);

    image.deleteOne();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Portfolio image deleted successfully",
      portfolio: user.portfolio,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  profile,
  updateProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  uploadPortfolio,
  deletePortfolioImage,
  changePassword,
};
