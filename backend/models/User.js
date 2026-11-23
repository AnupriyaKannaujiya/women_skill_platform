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

    // ---- Provider: where and how she works ----
    serviceModes: {
      atCustomer: { type: Boolean, default: true }, // she visits the customer
      atProvider: { type: Boolean, default: false }, // customer comes to her
    },

    // Shown to a customer only after she accepts an "at her place" booking.
    providerAddress: {
      type: String,
      maxlength: 300,
    },

    // Where she starts from; used only on the server to work out travel distance.
    baseLocation: {
      lat: Number,
      lng: Number,
    },

    travel: {
      freeKm: { type: Number, default: 0, min: 0, max: 100 },
      slabs: [
        {
          _id: false,
          uptoKm: { type: Number, min: 0.5, max: 200 },
          charge: { type: Number, min: 0, max: 100000 },
        },
      ],
      perKmBeyond: { type: Number, default: 0, min: 0, max: 1000 },
      maxKm: { type: Number, default: 0, min: 0, max: 500 }, // 0 = no limit
    },

    // Duration packages, e.g. 2 hours ₹500, overnight ₹2500.
    packages: [
      {
        label: { type: String, maxlength: 40 },
        hours: { type: Number, min: 0.5, max: 24 },
        price: { type: Number, min: 0, max: 1000000 },
        overnight: { type: Boolean, default: false },
      },
    ],

    overtimeRate: { type: Number, default: 0, min: 0, max: 100000 }, // per extra hour

    // Weekly hours in local time; day 0 = Sunday.
    workingHours: [
      {
        _id: false,
        day: { type: Number, min: 0, max: 6 },
        enabled: Boolean,
        start: String, // "10:00"
        end: String, // "19:00"
      },
    ],

    // Days off, "YYYY-MM-DD".
    blockedDates: [String],

    // Safety: only take bookings from customers whose ID the team has checked.
    requireVerifiedCustomers: { type: Boolean, default: false },

    // Safety: people told when she presses SOS.
    emergencyContacts: [
      {
        name: { type: String, maxlength: 60 },
        phone: { type: String, maxlength: 20 },
        email: { type: String, maxlength: 120 },
        relation: { type: String, maxlength: 30 },
      },
    ],

    // Safety: receive SOS alerts from providers near her base location.
    sosNearbyAlerts: { type: Boolean, default: true },

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
