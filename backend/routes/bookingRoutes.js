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
  getProviderDashboard,
  getCustomerDashboard,
} = require("../controllers/bookingController");

router.post(
  "/",
  authMiddleware,
  roleMiddleware("customer"),
  [
    body("provider").notEmpty().withMessage("Provider is required"),

    body("service").notEmpty().withMessage("Service is required"),

    body("bookingDate").notEmpty().withMessage("Booking date is required"),

    body("address").notEmpty().withMessage("Address is required"),
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

router.get("/provider/dashboard", authMiddleware, getProviderDashboard);

router.get(
  "/customer/dashboard",
  authMiddleware,
  roleMiddleware("customer"),
  getCustomerDashboard,
);

module.exports = router;
