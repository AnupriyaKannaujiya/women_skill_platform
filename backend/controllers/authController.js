const handleError = require("../utils/handleError");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const crypto = require("crypto");
const { publicIdFromUrl, destroyImage } = require("../utils/cloudinaryHelpers");
const { sendMail } = require("../utils/mailer");

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
// strength 2 = compare ignoring case.
const EMAIL_COLLATION = { locale: "en", strength: 2 };

// Accepts ["Mehndi", "Tailoring, Crafting"] or "Mehndi, Tailoring" and returns a clean array.
const normalizeSkills = (skill) => {
  if (skill === undefined) return undefined;
  const list = Array.isArray(skill) ? skill : [skill];
  return [
    ...new Set(
      list
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
};

const register = async (req, res) => {
  try {
    const {
      name,
      email: rawEmail,
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

    const email = normalizeEmail(rawEmail);

    const existingUser = await User.findOne({ email }).collation(EMAIL_COLLATION);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const allowedRoles = ["customer", "provider"];

    const userRole = allowedRoles.includes(role) ? role : "customer";

    const userData = {
      name,
      email,
      password: hashedPassword,
      phone,
      whatsapp,
      city,
      area,
      role: userRole,
    };

    // Skill, price, experience and description only mean something for providers.
    if (userRole === "provider") {
      Object.assign(userData, {
        skill: normalizeSkills(skill),
        experience,
        price,
        description,
      });
    }

    const user = await User.create(userData);

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      success: true,
      message: "Registration Successful",
      user: safeUser,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    // Case-insensitive match, so accounts created before emails were lower-cased still work.
    const user = await User.findOne({ email }).collation(EMAIL_COLLATION);

    // Same message for unknown email and wrong password, so the API
    // does not reveal which emails are registered.
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked by admin",
      });
    }

    const token = signToken(user._id);

    const safeUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    res.status(200).json(user);
  } catch (error) {
    handleError(res, error);
  }
};

const updateProfile = async (req, res) => {
  try {
    // `photo` is intentionally not accepted here: it can only be set through
    // /upload-photo, so nobody can point their avatar at an arbitrary URL.
    const { name, phone, whatsapp, city, area, skill, experience, price, description } =
      req.body;

    const updateData = { name, phone, whatsapp, city, area };

    if (req.user.role === "provider") {
      Object.assign(updateData, {
        skill: normalizeSkills(skill),
        experience,
        price,
        description,
      });
    }

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
    handleError(res, error);
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

    const previousPhoto = req.user.photo;

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

    // Delete the old photo only after the new one is saved.
    if (previousPhoto && previousPhoto !== result.secure_url) {
      await destroyImage(publicIdFromUrl(previousPhoto));
    }

    res.status(200).json({
      success: true,
      message: "Profile photo uploaded successfully",
      photo: result.secure_url,
      user: updatedUser,
    });
  } catch (error) {
    handleError(res, error);
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

    await destroyImage(publicIdFromUrl(user.photo));

    user.photo = "";

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(200).json({
      success: true,
      message: "Profile photo removed successfully",
      user: safeUser,
    });
  } catch (error) {
    handleError(res, error);
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
    handleError(res, error);
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
    handleError(res, error);
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
    user.passwordChangedAt = new Date();

    await user.save();

    // Other devices are signed out; this one gets a fresh token so it stays logged in.
    res.status(200).json({
      success: true,
      message: "Password changed successfully",
      token: signToken(user._id),
    });
  } catch (error) {
    handleError(res, error);
  }
};

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// First configured frontend origin, used to build the link in the email.
const clientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");

const forgotPassword = async (req, res) => {
  // The reply is the same whether or not the email exists, so the form
  // cannot be used to discover who has an account.
  const genericReply = {
    success: true,
    message: "If an account exists for that email, a reset link is on its way. It is valid for 30 minutes.",
  };

  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email }).collation(EMAIL_COLLATION);

    if (!user || user.isBlocked) {
      return res.status(200).json(genericReply);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const link = `${clientUrl()}/reset-password/${rawToken}`;
    const firstName = String(user.name || "").split(" ")[0] || "there";

    try {
      await sendMail({
        to: user.email,
        subject: "Reset your Women Skill password",
        text:
          `Hi ${firstName},\n\nSomeone asked to reset the password for your Women Skill account.\n` +
          `Open this link to choose a new password (valid for 30 minutes):\n\n${link}\n\n` +
          "If this was not you, you can ignore this email. Your password stays the same.",
        html:
          `<p>Hi ${firstName},</p><p>Someone asked to reset the password for your Women Skill account.</p>` +
          `<p><a href="${link}">Choose a new password</a> (valid for 30 minutes).</p>` +
          "<p>If this was not you, you can ignore this email. Your password stays the same.</p>",
      });
    } catch (mailError) {
      // Undo the token so a link that never arrived cannot be used later.
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      console.error("Reset email failed:", mailError.message);
      return res.status(503).json({
        success: false,
        message: "We could not send the email right now. Please try again in a few minutes.",
      });
    }

    res.status(200).json(genericReply);
  } catch (error) {
    handleError(res, error);
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = String(req.params.token || "");

    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!token || !user) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired. Please ask for a new one.",
      });
    }

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Your password has been reset. You can log in with the new one now.",
      email: user.email,
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
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
