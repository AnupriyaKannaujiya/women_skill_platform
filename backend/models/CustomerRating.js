const mongoose = require("mongoose");

// A provider's rating of a customer after a completed booking (one per booking).
// Only the average is shown to other providers; the note is private to admins.
const customerRatingSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    tags: [{ type: String, maxlength: 40 }],
    note: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

customerRatingSchema.index({ customer: 1, createdAt: -1 });

// Allowed quick tags, so the stored values stay consistent.
customerRatingSchema.statics.TAGS = [
  "On time",
  "Respectful",
  "Safe place",
  "Paid promptly",
  "Clear instructions",
  "Late",
  "Rude",
  "Payment delay",
  "Felt unsafe",
  "Changed plans last minute",
];

module.exports = mongoose.model("CustomerRating", customerRatingSchema);
