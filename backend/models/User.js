const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
    },

    whatsapp: {
      type: String,
    },

    city: {
      type: String,
    },

    area: {
      type: String,
    },

    pincode: {
      type: String,
    },

    skill: [
      {
        type: String,
      },
    ],

    experience: {
      type: Number,
      default: 0,
      min: [0, "Experience cannot be negative"],
      max: [80, "Experience looks too high"],
    },

    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },

    description: {
      type: String,
    },

    photo: {
      type: String,
    },

    portfolio: [
      {
        url: {
          type: String,
        },
        public_id: {
          type: String,
        },
      },
    ],

    role: {
      type: String,
      enum: ["customer", "provider", "admin"],
      default: "customer",
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    rating: {
      type: Number,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    // Password reset: only a SHA-256 hash of the emailed token is stored.
    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      select: false,
    },

    // Login tokens issued before this moment stop working (set on password change/reset).
    passwordChangedAt: {
      type: Date,
    },

    // Booking and account emails (in-app notifications are always on).
    emailNotifications: {
      type: Boolean,
      default: true,
    },

    // Public flag shown as the "Verified" badge and used by the search filter.
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Provider ID check. Never sent on public endpoints.
    verification: {
      status: {
        type: String,
        enum: ["unverified", "pending", "verified", "rejected"],
        default: "unverified",
      },
      idType: {
        type: String,
        enum: ["aadhaar", "pan", "voter", "driving", "passport", "other"],
      },
      // Private Cloudinary file; removed once an admin decides.
      document: {
        public_id: String,
        format: String,
      },
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      note: {
        type: String,
        maxlength: 300,
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
