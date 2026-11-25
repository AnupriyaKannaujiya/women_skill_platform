const mongoose = require("mongoose");

// A provider reporting a customer to the Women Skill team.
const REASONS = ["harassment", "unsafe", "abusive", "no_show", "payment", "fake", "other"];
// Reasons that touch her safety: always emailed to admins, shown first.
const SERIOUS = ["harassment", "unsafe"];

const customerReportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    reason: { type: String, enum: REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1500 },
    serious: { type: Boolean, default: false },

    // open → resolved (with an action) or dismissed
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
    action: { type: String, enum: ["none", "warned", "blocked"], default: "none" },
    adminNote: { type: String, trim: true, maxlength: 500 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
  },
  { timestamps: true },
);

customerReportSchema.index({ status: 1, serious: -1, createdAt: -1 });
customerReportSchema.index({ customer: 1, status: 1 });

customerReportSchema.statics.REASONS = REASONS;
customerReportSchema.statics.SERIOUS = SERIOUS;

module.exports = mongoose.model("CustomerReport", customerReportSchema);
