import { useEffect, useState } from "react";
import api from "../lib/api";
import { getError, formatDate } from "../lib/format";
import { dayLabel, freeStarts, fromLocal, localParts, minutesLabel, timeRange } from "../lib/calendar";
import { useToast } from "../context/ToastContext";
import { Loading, Modal } from "./ui";

// Pick a new time for an existing booking from the provider's calendar.
// The booking's own current slot does not count as busy.
export function RescheduleModal({ booking, providerId, viewer, onClose, onDone }) {
  const toast = useToast();
  const [calendar, setCalendar] = useState(null);
  const [date, setDate] = useState("");
  const [start, setStart] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  const hours = Number(booking.package?.hours) || 2;
  const overnight = Boolean(booking.package?.overnight);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/providers/${providerId}/availability`, { params: { days: 30 } })
      .then((response) => {
        if (cancelled) return;
        const ownStart = new Date(booking.bookingDate).getTime();
        // Free up this booking's current slot so nearby times can be chosen.
        setCalendar(
          (response.data.calendar || []).map((day) => ({
            ...day,
            busy: day.busy.filter((slot) => new Date(slot.start).getTime() !== ownStart),
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(getError(err, "Could not load her calendar."));
      });
    return () => {
      cancelled = true;
    };
  }, [providerId, booking.bookingDate]);

  // At least an hour's notice, matching the server rule.
  const minStart = now + 60 * 60 * 1000;
  const startsFor = (day) => freeStarts(day, hours, overnight, minStart - 30 * 60 * 1000);
  const day = calendar?.find((item) => item.date === date);
  const starts = day ? startsFor(day) : [];
  const newStart = date && start !== null ? fromLocal(date, start) : null;
  const sameAsNow = newStart && newStart.getTime() === new Date(booking.bookingDate).getTime();

  const submit = async (event) => {
    event.preventDefault();
    if (!newStart) return setError("Choose a new date and start time.");
    if (sameAsNow) return setError("That is the current time. Pick a different one.");
    setBusy(true);
    try {
      const response = await api.post(`/bookings/${booking._id}/reschedule`, { newStart: newStart.toISOString(), note: note.trim() });
      toast(response.data.message, "ok");
      onDone();
    } catch (err) {
      setError(getError(err));
      if (err?.response?.data?.code === "SLOT_UNAVAILABLE") setStart(null);
    } finally {
      setBusy(false);
    }
  };

  const other = viewer === "provider" ? booking.customer?.name || "The customer" : booking.provider?.name || "She";

  return (
    <Modal title={viewer === "provider" && booking.status === "pending" ? "Suggest another time" : "Ask for a new time"} wide onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted" style={{ marginBottom: 10 }}>
          Now: <strong>{dayLabel(localParts(booking.bookingDate).dateKey)}, {booking.endDate ? timeRange(booking.bookingDate, booking.endDate) : formatDate(booking.bookingDate)}</strong>.
          {" "}{other} will be asked to accept the new time; until then the booking stays as it is.
        </p>
        {!calendar && !error ? <Loading label="Loading her calendar" /> : null}
        {calendar ? (
          <>
            <div className="day-strip" role="listbox" aria-label="Choose a new date">
              {calendar.map((item) => {
                const count = startsFor(item).length;
                const disabled = item.status !== "open" || count === 0;
                return (
                  <button
                    key={item.date}
                    type="button"
                    role="option"
                    aria-selected={date === item.date}
                    className={["day-pill", date === item.date ? "selected" : "", disabled ? "disabled" : ""].join(" ")}
                    disabled={disabled}
                    onClick={() => { setDate(item.date); setStart(null); setError(""); }}
                  >
                    <span>{dayLabel(item.date)}</span>
                    <span className="help">{item.status === "blocked" ? "Day off" : item.status === "off" ? "Closed" : count ? `${count} slots` : "Full"}</span>
                  </button>
                );
              })}
            </div>
            {day ? (
              <div className="chip-row" style={{ margin: "10px 0" }}>
                {starts.map((minutes) => (
                  <button key={minutes} type="button" className={start === minutes ? "chip active" : "chip"} onClick={() => { setStart(minutes); setError(""); }}>
                    {minutesLabel(minutes)}
                  </button>
                ))}
                {!starts.length ? <span className="muted">No free time on this day.</span> : null}
              </div>
            ) : null}
            {newStart ? (
              <p className="note" style={{ margin: "8px 0" }}>
                New time: <strong>{dayLabel(date)}, {timeRange(newStart, new Date(newStart.getTime() + hours * 3600000))}</strong>
              </p>
            ) : null}
          </>
        ) : null}
        <label className="field" style={{ marginTop: 8 }}>
          <span>Reason <em className="help">optional, shown to {other}</em></span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Exam moved to that morning" />
        </label>
        {error ? <p className="error-text" role="alert" style={{ marginBottom: 10 }}>{error}</p> : null}
        <div className="cluster" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-line" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={busy || !newStart}>{busy ? "Sending…" : "Send new time"}</button>
        </div>
      </form>
    </Modal>
  );
}

// Banner on a booking card when a time change is waiting for an answer.
export function RescheduleBanner({ booking, viewer, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const request = booking.reschedule;
  if (request?.status !== "pending" || !["pending", "accepted"].includes(booking.status)) return null;

  const mine = request.proposedBy === viewer;
  const when = `${dayLabel(localParts(request.newStart).dateKey)}, ${timeRange(request.newStart, request.newEnd)}`;
  const other = viewer === "provider" ? booking.customer?.name || "The customer" : booking.provider?.name || "She";

  const act = async (method, url, body) => {
    setBusy(true);
    try {
      const response = await api[method](url, body);
      toast(response.data.message, "ok");
      onChanged();
    } catch (err) {
      toast(getError(err), "error");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="note reschedule-note" role="status">
      {mine ? (
        <>
          🕑 You asked to move this to <strong>{when}</strong>. Waiting for {other} to reply.
          <button className="btn btn-line btn-sm" type="button" disabled={busy} onClick={() => act("delete", `/bookings/${booking._id}/reschedule`)}>
            Withdraw
          </button>
        </>
      ) : (
        <>
          🕑 <strong>{other}</strong> asked to move this to <strong>{when}</strong>.
          {request.note ? <span className="help" style={{ display: "block" }}>“{request.note}”</span> : null}
          {booking.status === "pending" && viewer === "customer" ? (
            <span className="help" style={{ display: "block" }}>Accepting also confirms the booking.</span>
          ) : null}
          <span className="cluster" style={{ marginTop: 8 }}>
            <button className="btn btn-sage btn-sm" type="button" disabled={busy} onClick={() => act("put", `/bookings/${booking._id}/reschedule/respond`, { decision: "accept" })}>
              Accept new time
            </button>
            <button className="btn btn-line btn-sm" type="button" disabled={busy} onClick={() => act("put", `/bookings/${booking._id}/reschedule/respond`, { decision: "decline" })}>
              Keep original time
            </button>
          </span>
        </>
      )}
    </div>
  );
}

// True when this booking can still be moved by the viewer.
export function canReschedule(booking, now) {
  return (
    ["pending", "accepted"].includes(booking.status) &&
    booking.reschedule?.status !== "pending" &&
    !booking.checkInAt &&
    (booking.rescheduleCount || 0) < 3 &&
    new Date(booking.bookingDate).getTime() > now
  );
}
