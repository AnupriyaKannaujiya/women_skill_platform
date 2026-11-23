const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validationMiddleware");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  createBooking,
  getMyBookings,
  getProviderBookings,
  updateBookingStatus,
  cancelBooking,
  getProviderDashboard,
  getCustomerDashboard,
} = require("../controllers/bookingController");

router.post(
  "/",
  authMiddleware,
  roleMiddleware("customer"),
  [
    body("provider").notEmpty().withMessage("Provider is required"),

    body("service")
      .trim()
      .notEmpty()
      .withMessage("Service is required")
      .isLength({ max: 100 })
      .withMessage("Service is too long"),

    body("bookingDate").notEmpty().withMessage("Booking date is required"),

    body("address")
      .trim()
      .notEmpty()
      .withMessage("Address is required")
      .isLength({ max: 300 })
      .withMessage("Address is too long"),

    body("message").optional().isLength({ max: 1000 }).withMessage("Message is too long"),
  ],
  validate,
  createBooking,
);

router.get("/my", authMiddleware, roleMiddleware("customer"), getMyBookings);

router.get(
  "/provider",
  authMiddleware,
  roleMiddleware("provider"),
  getProviderBookings,
);

router.put(
  "/:id/status",
  authMiddleware,
  roleMiddleware("provider"),
  updateBookingStatus,
);

router.put("/:id/cancel", authMiddleware, roleMiddleware("customer"), cancelBooking);

router.get(
  "/provider/dashboard",
  authMiddleware,
  roleMiddleware("provider"),
  getProviderDashboard,
);

router.get(
  "/customer/dashboard",
  authMiddleware,
  roleMiddleware("customer"),
  getCustomerDashboard,
);

module.exports = router;
