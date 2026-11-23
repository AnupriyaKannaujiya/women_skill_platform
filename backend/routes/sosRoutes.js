const express = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { raiseSos, resolveSos, mySos, listSos } = require("../controllers/sosController");

const router = express.Router();

// Generous on purpose: an emergency must never be blocked, this only stops runaway loops.
const sosLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many alerts in a short time. Please call 112 directly." },
});

router.post("/", authMiddleware, roleMiddleware("provider"), sosLimiter, raiseSos);
router.get("/mine", authMiddleware, roleMiddleware("provider"), mySos);
router.put("/:id/resolve", authMiddleware, roleMiddleware("provider", "admin"), resolveSos);
router.get("/admin", authMiddleware, adminMiddleware, listSos);

module.exports = router;
