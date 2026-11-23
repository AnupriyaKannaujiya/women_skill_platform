const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validationMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const {
  register,
  login,
  profile,
  updateProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  uploadPortfolio,
  deletePortfolioImage,
  changePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

// Reset emails cost money and can annoy people, so keep requests per IP low.
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many reset requests. Please try again in an hour.",
  },
});

router.post(
  "/forgot-password",
  resetLimiter,
  [body("email").trim().isEmail().withMessage("Enter a valid email")],
  validate,
  forgotPassword,
);

router.post(
  "/reset-password/:token",
  resetLimiter,
  [
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  validate,
  resetPassword,
);

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),

    body("email").isEmail().withMessage("Valid email is required"),

    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  validate,
  register,
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),

    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  login,
);

router.get("/profile", authMiddleware, profile);

router.put("/profile", authMiddleware, updateProfile);

router.post(
  "/upload-photo",
  authMiddleware,
  upload.single("photo"),
  uploadProfilePhoto,
);

router.delete("/remove-photo", authMiddleware, removeProfilePhoto);

router.post(
  "/upload-portfolio",
  authMiddleware,
  roleMiddleware("provider"),
  upload.array("portfolio", 10),
  uploadPortfolio,
);

router.delete(
  "/portfolio/:imageId",
  authMiddleware,
  roleMiddleware("provider"),
  deletePortfolioImage,
);

router.put(
  "/change-password",
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),

    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  validate,
  authMiddleware,
  changePassword,
);

module.exports = router;
