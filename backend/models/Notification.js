const mongoose = require("mongoose");

// One in-app notification for one user (the bell in the header).
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // e.g. booking_new, booking_accepted, review_new, verification_approved
    type: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
      maxlength: 140,
    },

    body: {
      type: String,
      maxlength: 500,
    },

    // In-app path to open when the notification is clicked.
    link: {
      type: String,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });
// Old notifications clean themselves up after 90 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("Notification", notificationSchema);
