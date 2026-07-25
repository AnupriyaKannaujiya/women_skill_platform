const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  getAllUsers,
  deleteUser,
  getDashboardStats,
  toggleUserBlock,
  getAllBookings,
  getAllReviews,
  deleteReview,
} = require("../controllers/adminController");

const router = express.Router();

router.get("/users", authMiddleware, adminMiddleware, getAllUsers);

router.delete("/users/:id", authMiddleware, adminMiddleware, deleteUser);

router.get("/dashboard", authMiddleware, adminMiddleware, getDashboardStats);

router.put(
  "/users/:id/block",
  authMiddleware,
  adminMiddleware,
  toggleUserBlock,
);

router.get("/bookings", authMiddleware, adminMiddleware, getAllBookings);

router.get("/reviews", authMiddleware, adminMiddleware, getAllReviews);

router.delete("/reviews/:id", authMiddleware, adminMiddleware, deleteReview);

module.exports = router;
