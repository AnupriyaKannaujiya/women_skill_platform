const Booking = require("../models/Booking");
const { notify, formatWhen } = require("./notify");

// How often the background check runs while the server is up.
const MAINTENANCE_INTERVAL_MS = 15 * 60 * 1000;
// Reminders go out once, roughly a day before the booked time.
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const BATCH = 200;

// A request nobody answered before its booked time can no longer happen,
// so it is closed as "expired" instead of sitting in "pending" forever.
// Each booking is claimed with its own conditional update, so two overlapping
// runs never notify twice for the same booking.
const expireStalePendingBookings = async () => {
  const now = new Date();
  const stale = await Booking.find({ status: "pending", bookingDate: { $lt: now } })
    .select("_id")
    .limit(BATCH)
    .lean();

  let expired = 0;
  for (const { _id } of stale) {
    const booking = await Booking.findOneAndUpdate(
      { _id, status: "pending" },
      { $set: { status: "expired", expiredAt: now } },
      { returnDocument: "after" },
    )
      .populate("customer", "name")
      .populate("provider", "name");

    if (!booking) continue;
    expired += 1;

    const when = formatWhen(booking.bookingDate);
    notify({
      to: booking.customer?._id,
      type: "booking_expired",
      title: "Your booking request expired",
      body: `${booking.provider?.name || "The provider"} did not reply to your ${booking.service} request for ${when} in time. You can request someone else.`,
      link: "/customer/dashboard",
      booking: booking._id,
    });
    notify({
      to: booking.provider?._id,
      type: "booking_expired",
      title: "You missed a booking request",
      body: `The ${booking.service} request from ${booking.customer?.name || "a customer"} for ${when} expired without a reply. Answer requests quickly to get more work.`,
      link: "/provider/dashboard",
      booking: booking._id,
      email: false,
    });
  }
  return expired;
};

// One reminder to both sides about accepted work in the next 24 hours.
const sendUpcomingReminders = async () => {
  const now = new Date();
  const soon = new Date(now.getTime() + REMINDER_WINDOW_MS);
  const due = await Booking.find({
    status: "accepted",
    bookingDate: { $gt: now, $lte: soon },
    reminderSentAt: { $exists: false },
  })
    .select("_id")
    .limit(BATCH)
    .lean();

  let sent = 0;
  for (const { _id } of due) {
    const booking = await Booking.findOneAndUpdate(
      { _id, reminderSentAt: { $exists: false } },
      { $set: { reminderSentAt: now } },
      { returnDocument: "after" },
    )
      .populate("customer", "name")
      .populate("provider", "name");

    if (!booking) continue;
    sent += 1;

    const when = formatWhen(booking.bookingDate);
    notify({
      to: booking.customer?._id,
      type: "booking_reminder",
      title: `Reminder: ${booking.service} with ${booking.provider?.name || "your provider"}`,
      body: `Your booking is on ${when}. Her phone and WhatsApp are in My bookings if you need to reach her.`,
      link: "/customer/dashboard",
      booking: booking._id,
    });
    notify({
      to: booking.provider?._id,
      type: "booking_reminder",
      title: `Reminder: ${booking.service} for ${booking.customer?.name || "a customer"}`,
      body: `You have this booking on ${when} at ${booking.address}.`,
      link: "/provider/dashboard",
      booking: booking._id,
    });
  }
  return sent;
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
      const reminded = await sendUpcomingReminders();
      if (expired) console.log(`Expired ${expired} unanswered booking request(s)`);
      if (reminded) console.log(`Sent reminders for ${reminded} upcoming booking(s)`);
    } catch (error) {
      console.error("Booking maintenance failed:", error.message);
    }
  };

  run();
  const timer = setInterval(run, MAINTENANCE_INTERVAL_MS);
  // Do not keep the process alive just for this timer.
  timer.unref();
};

module.exports = {
  expireStalePendingBookings,
  sendUpcomingReminders,
  overdueFilter,
  startBookingMaintenance,
};
