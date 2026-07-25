const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  searchUsers,
  getAllUsers,
  getUserById,
  getMyProfile,
} = require("../controllers/userController");

router.get("/", authMiddleware, roleMiddleware("admin"), getAllUsers);
router.get("/search", searchUsers);
router.get("/profile", authMiddleware, getMyProfile);
router.get("/:id", getUserById);

module.exports = router;
