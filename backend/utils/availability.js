const Booking = require("../models/Booking");
const { localParts, fromLocal, toMinutes, addDays } = require("./time");

const HOUR = 60 * 60 * 1000;
// Bookings made before end times were stored are assumed to take 2 hours.
const LEGACY_HOURS = 2;
// Requests that still hold a slot in her calendar.
const BLOCKING_STATUSES = ["pending", "accepted"];

// Mon–Sat 10:00–19:00 until she sets her own hours.
const DEFAULT_WEEK = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  enabled: day !== 0,
  start: "10:00",
  end: "19:00",
}));

const weekOf = (provider) => {
  const saved = Array.isArray(provider.workingHours) ? provider.workingHours : [];
  return DEFAULT_WEEK.map((fallback) => {
    const found = saved.find((item) => Number(item.day) === fallback.day);
    return found
      ? { day: fallback.day, enabled: Boolean(found.enabled), start: found.start, end: found.end }
      : fallback;
  });
};

const endOf = (booking) =>
  booking.endDate ? new Date(booking.endDate) : new Date(new Date(booking.bookingDate).getTime() + LEGACY_HOURS * HOUR);

// Bookings that occupy her time between `from` and `to`.
const busyBookings = async (providerId, from, to, excludeId) => {
  const query = {
    provider: providerId,
    status: { $in: BLOCKING_STATUSES },
    bookingDate: { $lt: to, $gte: new Date(from.getTime() - 24 * HOUR) },
  };
  if (excludeId) query._id = { $ne: excludeId };
  const bookings = await Booking.find(query).select("bookingDate endDate status").lean();
  return bookings
    .map((booking) => ({ start: new Date(booking.bookingDate), end: endOf(booking), status: booking.status }))
    .filter((slot) => slot.end > from);
};

/**
 * Checks that a booking from `start` lasting `hours` fits her calendar.
 * Returns an error message, or null when the slot is free.
 */
const checkSlot = async (provider, start, hours, overnight, excludeId) => {
  const begin = new Date(start);
  const finish = new Date(begin.getTime() + hours * HOUR);
  const { dateKey, minutes, weekday } = localParts(begin);

  if ((provider.blockedDates || []).includes(dateKey)) {
    return "She is not available on this date. Please pick another day.";
  }

  const day = weekOf(provider).find((item) => item.day === weekday);
  const dayStart = toMinutes(day?.start);
  const dayEnd = toMinutes(day?.end);
  if (!day?.enabled || dayStart === null || dayEnd === null) {
    return "She does not work on this day of the week. Please pick another day.";
  }
  if (minutes < dayStart || minutes >= dayEnd) {
    return `Please choose a start time between ${day.start} and ${day.end}.`;
  }
  if (!overnight && minutes + hours * 60 > dayEnd) {
    return `This package takes ${hours} hours, so it has to start by ${String(Math.floor((dayEnd - hours * 60) / 60)).padStart(2, "0")}:${String((dayEnd - hours * 60) % 60).padStart(2, "0")} to finish within her working hours (until ${day.end}).`;
  }

  const clashes = await busyBookings(provider._id, begin, finish, excludeId);
  if (clashes.some((slot) => slot.start < finish && slot.end > begin)) {
    return "She already has a booking at this time. Please pick another time.";
  }
  return null;
};

/**
 * Calendar for the next `days` days: per day whether she works, her hours and busy slots.
 * Busy slots carry no customer details.
 */
const buildCalendar = async (provider, fromKey, days) => {
  const week = weekOf(provider);
  const blocked = new Set(provider.blockedDates || []);
  const from = fromLocal(fromKey);
  const to = fromLocal(addDays(fromKey, days));
  const busy = await busyBookings(provider._id, from, to);

  const result = [];
  for (let i = 0; i < days; i += 1) {
    const dateKey = addDays(fromKey, i);
    const weekday = localParts(fromLocal(dateKey, 12 * 60)).weekday;
    const day = week.find((item) => item.day === weekday);
    const dayStart = fromLocal(dateKey);
    const dayEnd = fromLocal(addDays(dateKey, 1));
    result.push({
      date: dateKey,
      weekday,
      status: blocked.has(dateKey) ? "blocked" : day.enabled ? "open" : "off",
      start: day.start,
      end: day.end,
      busy: busy
        .filter((slot) => slot.start < dayEnd && slot.end > dayStart)
        .map((slot) => ({ start: slot.start, end: slot.end })),
    });
  }
  return result;
};

module.exports = { DEFAULT_WEEK, weekOf, endOf, checkSlot, buildCalendar, BLOCKING_STATUSES };
