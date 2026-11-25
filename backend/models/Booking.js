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

    // Start time.
    bookingDate: {
      type: Date,
      required: true,
    },

    // Start + package hours; used for the calendar and safety check-out alerts.
    endDate: {
      type: Date,
    },

    // at_customer = she goes to the customer; at_provider = customer comes to her.
    serviceMode: {
      type: String,
      enum: ["at_customer", "at_provider"],
      default: "at_customer",
    },

    // Copy of the package at booking time, so later price edits do not change it.
    package: {
      label: String,
      hours: Number,
      price: Number,
      overnight: Boolean,
    },

    // Customer's address for at_customer visits ("At her place" for at_provider).
    address: {
      type: String,
      required: true,
    },

    customerLocation: {
      lat: Number,
      lng: Number,
    },

    distanceKm: {
      type: Number,
    },

    charges: {
      service: { type: Number, default: 0 },
      travel: { type: Number, default: 0 },
      overtime: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    overtimeHours: {
      type: Number,
      default: 0,
    },

    // Safety: she taps "I've arrived" and "I've left safely" on home visits.
    checkInAt: Date,
    checkOutAt: Date,
    safetyAlertAt: Date,

    // The open (or last) request to move this booking to another time.
    reschedule: {
      proposedBy: { type: String, enum: ["customer", "provider"] },
      newStart: Date,
      newEnd: Date,
      note: { type: String, maxlength: 300 },
      status: { type: String, enum: ["pending", "accepted", "declined", "withdrawn"] },
      createdAt: Date,
      respondedAt: Date,
    },

    // Every time change that was agreed, oldest first.
    rescheduleHistory: [
      {
        _id: false,
        proposedBy: String,
        from: Date,
        to: Date,
        at: Date,
      },
    ],

    rescheduleCount: { type: Number, default: 0 },

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
