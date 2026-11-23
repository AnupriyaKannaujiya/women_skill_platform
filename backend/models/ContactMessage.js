const mongoose = require("mongoose");

// A note sent from the public Contact page, read by admins.
const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Set when the sender was logged in.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

contactMessageSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
