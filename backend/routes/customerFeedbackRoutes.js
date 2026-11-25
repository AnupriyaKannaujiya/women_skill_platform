const express = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  rateCustomer,
  myRatings,
  reportCustomer,
  myReports,
  blockCustomer,
  unblockCustomer,
  listBlocked,
} = require("../controllers/customerFeedbackController");

const router = express.Router();
const provider = [authMiddleware, roleMiddleware("provider")];

// Keeps the report form from being used to flood the team inbox.
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many reports in an hour. For an emergency, use SOS or call 112." },
});

router.post("/ratings", ...provider, rateCustomer);
router.get("/ratings/mine", ...provider, myRatings);
router.post("/reports", ...provider, reportLimiter, reportCustomer);
router.get("/reports/mine", ...provider, myReports);
router.get("/blocked", ...provider, listBlocked);
router.post("/blocked/:id", ...provider, blockCustomer);
router.delete("/blocked/:id", ...provider, unblockCustomer);

module.exports = router;
