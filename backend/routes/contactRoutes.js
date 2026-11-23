const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const validate = require("../middleware/validationMiddleware");
const { createMessage } = require("../controllers/contactController");

const router = express.Router();

// Public form: keep it from being used to flood the inbox.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many messages. Please try again in an hour.",
  },
});

router.post(
  "/",
  contactLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 80 }),
    body("email")
      .optional({ values: "falsy" })
      .trim()
      .isEmail()
      .withMessage("Enter a valid email or leave it empty"),
    body("message")
      .trim()
      .notEmpty()
      .withMessage("Message is required")
      .isLength({ max: 2000 })
      .withMessage("Message is too long (2000 characters max)"),
  ],
  validate,
  createMessage,
);

module.exports = router;
