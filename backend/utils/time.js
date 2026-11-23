// Working hours and calendar days are in the platform's local time (India by default).
// MongoDB stores UTC, so every conversion goes through this fixed offset.
const OFFSET_MINUTES = Number(process.env.TZ_OFFSET_MINUTES ?? 330);
const MINUTE = 60 * 1000;

const pad = (n) => String(n).padStart(2, "0");

// Date -> { dateKey: "2026-11-23", minutes: 570, weekday: 0-6 (Sun-Sat) } in local time.
const localParts = (date) => {
  const shifted = new Date(new Date(date).getTime() + OFFSET_MINUTES * MINUTE);
  return {
    dateKey: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
};

// ("2026-11-23", 570) -> Date for 09:30 local time on that day.
const fromLocal = (dateKey, minutes = 0) => {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - OFFSET_MINUTES * MINUTE);
};

// "09:30" -> 570
const toMinutes = (hhmm) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!match) return null;
  const value = Number(match[1]) * 60 + Number(match[2]);
  return value >= 0 && value <= 24 * 60 ? value : null;
};

const addDays = (dateKey, days) => localParts(new Date(fromLocal(dateKey).getTime() + days * 24 * 60 * MINUTE + MINUTE)).dateKey;

const isDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

module.exports = { OFFSET_MINUTES, localParts, fromLocal, toMinutes, addDays, isDateKey };
