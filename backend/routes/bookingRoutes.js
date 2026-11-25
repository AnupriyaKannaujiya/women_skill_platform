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
  checkIn,
  checkOut,
  getProviderDashboard,
  getCustomerDashboard,
} = require("../controllers/bookingController");
const {
  proposeReschedule,
  respondReschedule,
  withdrawReschedule,
} = require("../controllers/rescheduleController");

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

    // No address is needed when the customer goes to her place.
    body("address")
      .if(body("serviceMode").not().equals("at_provider"))
      .trim()
      .notEmpty()
      .withMessage("Address is required")
      .isLength({ max: 300 })
      .withMessage("Address is too long"),

    body("message").optional().isLength({ max: 1000 }).withMessage("Message is too long"),

    body("serviceMode")
      .optional()
      .isIn(["at_customer", "at_provider"])
      .withMessage("Choose where the service will happen"),
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

router.put("/:id/check-in", authMiddleware, roleMiddleware("provider"), checkIn);

router.put("/:id/check-out", authMiddleware, roleMiddleware("provider"), checkOut);

// Moving a booking to another time: either side proposes, the other side answers.
const bothSides = [authMiddleware, roleMiddleware("customer", "provider")];
router.post("/:id/reschedule", ...bothSides, proposeReschedule);
router.put("/:id/reschedule/respond", ...bothSides, respondReschedule);
router.delete("/:id/reschedule", ...bothSides, withdrawReschedule);

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
