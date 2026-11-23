const mongoose = require("mongoose");

// An emergency alert raised by a provider.
const sosAlertSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Booking she was on (if any), so responders know where and with whom.
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },

    location: {
      lat: Number,
      lng: Number,
      accuracy: Number, // metres, as reported by her phone
    },

    message: {
      type: String,
      maxlength: 300,
    },

    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
    },

    // Who was told, for the record.
    notified: {
      admins: { type: Number, default: 0 },
      contacts: { type: Number, default: 0 },
      nearby: { type: Number, default: 0 },
    },

    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolutionNote: {
      type: String,
      maxlength: 300,
    },
  },
  { timestamps: true },
);

sosAlertSchema.index({ status: 1, createdAt: -1 });
sosAlertSchema.index({ provider: 1, createdAt: -1 });

module.exports = mongoose.model("SosAlert", sosAlertSchema);
