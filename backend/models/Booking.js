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
      // "cancelled" = withdrawn by the customer; "rejected" = turned down by the provider.
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
      default: "pending",
    },

    cancelledAt: {
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

module.exports = mongoose.model("Booking", bookingSchema);
