const Booking = require("../models/Booking");

// How often the background check runs while the server is up.
const EXPIRE_INTERVAL_MS = 15 * 60 * 1000;

// A request nobody answered before its booked time can no longer happen,
// so it is closed as "expired" instead of sitting in "pending" forever.
const expireStalePendingBookings = async () => {
  const now = new Date();
  const result = await Booking.updateMany(
    { status: "pending", bookingDate: { $lt: now } },
    { $set: { status: "expired", expiredAt: now } },
  );
  return result.modifiedCount || 0;
};

// Accepted work whose date has passed but was never marked completed or cancelled.
const overdueFilter = (extra = {}) => ({
  ...extra,
  status: "accepted",
  bookingDate: { $lt: new Date() },
});

const startBookingMaintenance = () => {
  const run = async () => {
    try {
      const expired = await expireStalePendingBookings();
      if (expired) console.log(`Expired ${expired} unanswered booking request(s)`);
    } catch (error) {
      console.error("Booking maintenance failed:", error.message);
    }
  };

  run();
  const timer = setInterval(run, EXPIRE_INTERVAL_MS);
  // Do not keep the process alive just for this timer.
  timer.unref();
};

module.exports = { expireStalePendingBookings, overdueFilter, startBookingMaintenance };
