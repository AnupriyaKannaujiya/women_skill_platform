const mongoose = require("mongoose");
const CustomerRating = require("../models/CustomerRating");
const CustomerReport = require("../models/CustomerReport");
const User = require("../models/User");

// Recomputes a customer's average rating from providers.
const updateCustomerRating = async (customerId) => {
  const [stats] = await CustomerRating.aggregate([
    { $match: { customer: new mongoose.Types.ObjectId(String(customerId)) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await User.findByIdAndUpdate(customerId, {
    customerRating: stats ? Number(stats.avg.toFixed(1)) : 0,
    customerRatingCount: stats ? stats.count : 0,
  });
};

// Reports that still count against a customer: open ones, and ones the team upheld.
const COUNTING_REPORTS = { $or: [{ status: "open" }, { status: "resolved", action: { $in: ["warned", "blocked"] } }] };

/**
 * For each customer id: { rating, ratingCount, reportedBy } where reportedBy is the number of
 * different providers with a counting report. No reporter names or details are included.
 */
const safetySummaries = async (customerIds) => {
  const ids = [...new Set(customerIds.filter(Boolean).map(String))].map((id) => new mongoose.Types.ObjectId(id));
  if (!ids.length) return {};

  const [users, reports] = await Promise.all([
    User.find({ _id: { $in: ids } }).select("customerRating customerRatingCount").lean(),
    CustomerReport.aggregate([
      { $match: { customer: { $in: ids }, ...COUNTING_REPORTS } },
      { $group: { _id: "$customer", reporters: { $addToSet: "$reporter" } } },
    ]),
  ]);

  const result = {};
  for (const user of users) {
    result[String(user._id)] = {
      rating: user.customerRating || 0,
      ratingCount: user.customerRatingCount || 0,
      reportedBy: 0,
    };
  }
  for (const row of reports) {
    if (result[String(row._id)]) result[String(row._id)].reportedBy = row.reporters.length;
  }
  return result;
};

module.exports = { updateCustomerRating, safetySummaries, COUNTING_REPORTS };
