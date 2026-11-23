import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Loading } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { useProviderSettings } from "../../lib/useProviderSettings";
import { WEEKDAYS, WEEKDAYS_LONG, addDays, dayLabel, localParts, minutesLabel } from "../../lib/calendar";

// Monday-first order for the editor and the month grid.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

function MonthCalendar({ monthKey, week, blocked, bookings, onToggleDay }) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = `${monthKey}-01`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = localParts(new Date(Date.UTC(year, month - 1, 1, 6))).weekday;
  const lead = (firstWeekday + 6) % 7;
  const today = localParts(new Date()).dateKey;

  const byDay = useMemo(() => {
    const map = {};
    for (const booking of bookings) {
      if (!["pending", "accepted", "completed"].includes(booking.status)) continue;
      const key = localParts(booking.bookingDate).dateKey;
      (map[key] = map[key] || []).push(booking);
    }
    // Earliest first within each day.
    for (const list of Object.values(map)) {
      list.sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));
    }
    return map;
  }, [bookings]);

  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 0; d < daysInMonth; d += 1) cells.push(addDays(first, d));

  return (
    <div className="month-grid" role="grid" aria-label="Month calendar">
      {ORDER.map((day) => (
        <div className="month-head" key={day} role="columnheader">{WEEKDAYS[day]}</div>
      ))}
      {cells.map((dateKey, index) => {
        if (!dateKey) return <div key={`blank-${index}`} className="month-cell blank" />;
        const weekday = (localParts(new Date(Date.UTC(year, month - 1, Number(dateKey.slice(8)), 6))).weekday);
        const isOff = !week.find((item) => item.day === weekday)?.enabled;
        const isBlocked = blocked.includes(dateKey);
        const past = dateKey < today;
        const list = byDay[dateKey] || [];
        const classes = ["month-cell", past ? "past" : "", isBlocked ? "blocked" : isOff ? "off" : "open", dateKey === today ? "today" : ""].join(" ");
        return (
          <button
            key={dateKey}
            type="button"
            className={classes}
            disabled={past}
            title={isBlocked ? "Day off — click to open" : isOff ? "Not a working day" : "Click to mark as a day off"}
            onClick={() => onToggleDay(dateKey)}
          >
            <span className="month-num">{Number(dateKey.slice(8))}</span>
            {isBlocked ? <span className="month-tag">Off</span> : null}
            {list.slice(0, 3).map((booking) => (
              <span key={booking._id} className={`month-booking status-${booking.status}`}>
                {minutesLabel(localParts(booking.bookingDate).minutes)} {booking.service}
              </span>
            ))}
            {list.length > 3 ? <span className="help">+{list.length - 3} more</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function AvailabilityEditor({ initial, save, saving }) {
  const toast = useToast();
  const [week, setWeek] = useState(initial.workingHours);
  const [blocked, setBlocked] = useState(initial.blockedDates);
  const [bookings, setBookings] = useState([]);
  const [monthKey, setMonthKey] = useState(() => localParts(new Date()).dateKey.slice(0, 7));
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/bookings/provider").then((response) => setBookings(response.data.bookings || [])).catch(() => {});
  }, []);

  const setDay = (day, key, value) =>
    setWeek((current) => current.map((item) => (item.day === day ? { ...item, [key]: value } : item)));

  const persist = async (patch, okMessage) => {
    setError("");
    const result = await save(patch);
    if (result.ok) toast(okMessage, "ok");
    else setError(result.message);
    return result.ok;
  };

  const toggleDay = async (dateKey) => {
    const next = blocked.includes(dateKey) ? blocked.filter((d) => d !== dateKey) : [...blocked, dateKey].sort();
    const hasBooking = bookings.some(
      (b) => ["pending", "accepted"].includes(b.status) && localParts(b.bookingDate).dateKey === dateKey,
    );
    if (!blocked.includes(dateKey) && hasBooking) {
      toast("You have a booking that day. Cancel or reschedule it first, then mark the day off.", "error");
      return;
    }
    setBlocked(next);
    const ok = await persist({ blockedDates: next }, blocked.includes(dateKey) ? `${dayLabel(dateKey)} is open again.` : `${dayLabel(dateKey)} marked as a day off.`);
    if (!ok) setBlocked(blocked);
  };

  const shiftMonth = (delta) => {
    const [y, m] = monthKey.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonthKey(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  const thisMonth = localParts(new Date()).dateKey.slice(0, 7);
  const monthName = new Date(`${monthKey}-15T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <>
      <section className="card" style={{ marginBottom: 14 }}>
        <h2>Weekly working hours</h2>
        <p className="muted" style={{ margin: "4px 0 12px" }}>Customers can only book times inside these hours.</p>
        {ORDER.map((day) => {
          const item = week.find((entry) => entry.day === day);
          return (
            <div className="hours-row" key={day}>
              <label className="check-field" style={{ margin: 0, minWidth: 120 }}>
                <input type="checkbox" checked={item.enabled} onChange={(e) => setDay(day, "enabled", e.target.checked)} />
                <span>{WEEKDAYS_LONG[day]}</span>
              </label>
              {item.enabled ? (
                <>
                  <input aria-label={`${WEEKDAYS_LONG[day]} start`} type="time" value={item.start} onChange={(e) => setDay(day, "start", e.target.value)} />
                  <span>to</span>
                  <input aria-label={`${WEEKDAYS_LONG[day]} end`} type="time" value={item.end} onChange={(e) => setDay(day, "end", e.target.value)} />
                </>
              ) : (
                <span className="muted">Not working</span>
              )}
            </div>
          );
        })}
        {error ? <p className="error-text" role="alert" style={{ margin: "8px 0" }}>{error}</p> : null}
        <button className="btn btn-primary" type="button" disabled={saving} onClick={() => persist({ workingHours: week }, "Working hours saved.")} style={{ marginTop: 10 }}>
          {saving ? "Saving…" : "Save working hours"}
        </button>
      </section>

      <section className="card">
        <div className="split" style={{ marginBottom: 10 }}>
          <h2>{monthName}</h2>
          <div className="cluster">
            <button className="btn btn-line btn-sm" type="button" onClick={() => shiftMonth(-1)} disabled={monthKey <= thisMonth}>‹ Prev</button>
            <button className="btn btn-line btn-sm" type="button" onClick={() => shiftMonth(1)}>Next ›</button>
          </div>
        </div>
        <p className="help" style={{ marginBottom: 10 }}>
          Click a date to mark it as a day off (or open it again). Your bookings are shown on each day.
        </p>
        <MonthCalendar monthKey={monthKey} week={week} blocked={blocked} bookings={bookings} onToggleDay={toggleDay} />
        <div className="cluster legend" style={{ marginTop: 10 }}>
          <span><i className="dot open" /> Working day</span>
          <span><i className="dot off" /> Not working</span>
          <span><i className="dot blocked" /> Day off</span>
          <span><i className="dot booked" /> Booking</span>
        </div>
      </section>
    </>
  );
}

function Availability() {
  usePageTitle("Availability");
  const { settings, error, saving, save } = useProviderSettings();
  return (
    <div style={{ maxWidth: 860 }}>
      <p className="eyebrow">Provider</p>
      <h1 className="section-title" style={{ margin: "8px 0 8px" }}>Availability calendar</h1>
      <p className="muted" style={{ marginBottom: 16 }}>Your hours, days off and bookings in one place.</p>
      {error ? <div className="note note-error">{error}</div> : null}
      {settings ? <AvailabilityEditor initial={settings} save={save} saving={saving} /> : !error ? <Loading label="Loading" /> : null}
    </div>
  );
}

export default Availability;
