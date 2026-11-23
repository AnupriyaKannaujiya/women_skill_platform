// Calendar helpers in the platform's local time (India, UTC+5:30), matching the API.
const OFFSET_MINUTES = Number(import.meta.env.VITE_TZ_OFFSET_MINUTES ?? 330);
const MINUTE = 60 * 1000;

const pad = (n) => String(n).padStart(2, "0");

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function localParts(date) {
  const shifted = new Date(new Date(date).getTime() + OFFSET_MINUTES * MINUTE);
  return {
    dateKey: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

export function fromLocal(dateKey, minutes = 0) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - OFFSET_MINUTES * MINUTE);
}

export function toMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function minutesLabel(total) {
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function addDays(dateKey, days) {
  return localParts(new Date(fromLocal(dateKey).getTime() + days * 24 * 60 * MINUTE + MINUTE)).dateKey;
}

export function dayLabel(dateKey) {
  return fromLocal(dateKey, 12 * 60).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function timeRange(start, end) {
  const s = localParts(start);
  const e = localParts(end);
  const sameDay = s.dateKey === e.dateKey;
  return `${minutesLabel(s.minutes)} – ${minutesLabel(e.minutes)}${sameDay ? "" : " (next day)"}`;
}

/**
 * Start times (minutes) on `day` where a `hours`-long package fits:
 * inside working hours (unless overnight), not in the past, not overlapping busy slots.
 */
export function freeStarts(day, hours, overnight, now = Date.now(), step = 30) {
  if (!day || day.status !== "open") return [];
  const start = toMinutes(day.start);
  const end = toMinutes(day.end);
  if (start === null || end === null) return [];
  const last = overnight ? end - step : end - hours * 60;
  const busy = (day.busy || []).map((slot) => [new Date(slot.start).getTime(), new Date(slot.end).getTime()]);
  const result = [];
  for (let m = start; m <= last; m += step) {
    const begin = fromLocal(day.date, m).getTime();
    const finish = begin + hours * 60 * MINUTE;
    if (begin < now + 30 * MINUTE) continue;
    if (busy.some(([b, e]) => b < finish && e > begin)) continue;
    result.push(m);
  }
  return result;
}
