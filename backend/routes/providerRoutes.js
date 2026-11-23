const express = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  getSettings,
  updateSettings,
  getAvailability,
  getQuote,
} = require("../controllers/providerSettingsController");

const router = express.Router();

// Quotes reveal a rounded distance; limiting them makes it hard to triangulate her base.
const quoteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many price checks. Please wait a few minutes." },
});

router.get("/settings", authMiddleware, roleMiddleware("provider"), getSettings);
router.put("/settings", authMiddleware, roleMiddleware("provider"), updateSettings);

router.get("/:id/availability", getAvailability);
router.post("/:id/quote", quoteLimiter, getQuote);

module.exports = router;
