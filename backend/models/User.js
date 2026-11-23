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
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
