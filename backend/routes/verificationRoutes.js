const express = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { getMyVerification, submitVerification } = require("../controllers/verificationController");

const router = express.Router();

// Uploads go to Cloudinary; a handful per hour is plenty for a real person.
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many uploads. Please try again later." },
});

router.get("/me", authMiddleware, roleMiddleware("provider"), getMyVerification);

router.post(
  "/",
  authMiddleware,
  roleMiddleware("provider"),
  uploadLimiter,
  upload.single("document"),
  submitVerification,
);

module.exports = router;
