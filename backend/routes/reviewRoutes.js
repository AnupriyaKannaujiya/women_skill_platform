const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validationMiddleware");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  addReview,
  updateReview,
  getProviderReviews,
  deleteReview,
} = require("../controllers/reviewController");

router.post(
  "/",
  [
    body("provider").notEmpty().withMessage("Provider is required"),

    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),

    body("comment").notEmpty().withMessage("Comment is required"),
  ],
  validate,
  authMiddleware,
  roleMiddleware("customer"),
  addReview,
);

router.put("/:id", authMiddleware, roleMiddleware("customer"), updateReview);

router.get("/:providerId", getProviderReviews);

router.delete("/:id", authMiddleware, roleMiddleware("customer"), deleteReview);

module.exports = router;
