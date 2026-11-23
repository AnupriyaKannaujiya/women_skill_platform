const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    service: {
      type: String,
      required: true,
    },

    bookingDate: {
      type: Date,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    message: {
      type: String,
    },

    status: {
      type: String,
      // rejected  = provider turned down a pending request
      // cancelled = an accepted/pending booking called off (see cancelledBy)
      // expired   = still pending when the booked time passed (no reply)
      enum: ["pending", "accepted", "rejected", "completed", "cancelled", "expired"],
      default: "pending",
    },

    cancelledAt: {
      type: Date,
    },

    cancelledBy: {
      type: String,
      enum: ["customer", "provider"],
    },

    expiredAt: {
      type: Date,
    },

    // Set when the "booking is tomorrow" reminder has gone out, so it is sent once.
    reminderSentAt: {
      type: Date,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

// Dashboards and the duplicate-request check look bookings up by these fields.
bookingSchema.index({ customer: 1, provider: 1, status: 1 });
bookingSchema.index({ provider: 1, createdAt: -1 });
// Used by the job that expires unanswered requests.
bookingSchema.index({ status: 1, bookingDate: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
