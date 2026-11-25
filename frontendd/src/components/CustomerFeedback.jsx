import { useState } from "react";
import api from "../lib/api";
import { getError } from "../lib/format";
import { useToast } from "../context/ToastContext";
import { Modal, Stars } from "./ui";

export const RATING_TAGS = [
  "On time",
  "Respectful",
  "Safe place",
  "Paid promptly",
  "Clear instructions",
  "Late",
  "Rude",
  "Payment delay",
  "Felt unsafe",
  "Changed plans last minute",
];

export const REPORT_REASONS = [
  ["harassment", "Harassment or inappropriate behaviour"],
  ["unsafe", "Made me feel unsafe"],
  ["abusive", "Rude or abusive"],
  ["no_show", "Did not show up / not at the address"],
  ["payment", "Did not pay / payment dispute"],
  ["fake", "Fake booking or details"],
  ["other", "Something else"],
];

// What other providers think of a customer, shown on each request.
export function CustomerSafetyLine({ safety }) {
  if (!safety) return null;
  return (
    <span className="safety-line">
      {safety.ratingCount ? (
        <span title="Average rating this customer got from providers">
          ★ {Number(safety.rating).toFixed(1)} from {safety.ratingCount} provider{safety.ratingCount === 1 ? "" : "s"}
        </span>
      ) : (
        <span className="muted">No provider ratings yet</span>
      )}
      {safety.reportedBy >= 2 ? (
        <span className="report-flag" title="Several providers have reported this customer to the team">
          ⚠️ Reported by {safety.reportedBy} providers — take care
        </span>
      ) : null}
    </span>
  );
}

export function RateCustomerModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (tag) => setTags((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]));

  const submit = async (event) => {
    event.preventDefault();
    if (!rating) {
      setError("Choose 1 to 5 stars.");
      return;
    }
    setBusy(true);
    try {
      const response = await api.post("/customer-feedback/ratings", { bookingId: booking._id, rating, tags, note });
      toast(response.data.message, "ok");
      onDone(response.data.rating);
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Rate ${booking.customer?.name || "this customer"}`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted" style={{ marginBottom: 10 }}>
          Other providers see only the average. Your note is private to the Women Skill team.
        </p>
        <Stars value={rating} onChange={(value) => { setRating(value); setError(""); }} />
        <div className="chip-row" style={{ margin: "12px 0" }}>
          {RATING_TAGS.map((tag) => (
            <button key={tag} type="button" className={tags.includes(tag) ? "chip active" : "chip"} aria-pressed={tags.includes(tag)} onClick={() => toggle(tag)}>
              {tag}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Private note <em className="help">optional, only the team sees it</em></span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} style={{ minHeight: 70 }} />
        </label>
        {error ? <p className="error-text" role="alert" style={{ marginBottom: 10 }}>{error}</p> : null}
        <div className="cluster" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-line" type="button" onClick={onClose}>Later</button>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save rating"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function ReportCustomerModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const serious = reason === "harassment" || reason === "unsafe";

  const submit = async (event) => {
    event.preventDefault();
    if (!reason) return setError("Choose what happened.");
    if (details.trim().length < 10) return setError("Please describe what happened in a sentence or two.");
    setBusy(true);
    try {
      const response = await api.post("/customer-feedback/reports", {
        customerId: booking.customer?._id,
        bookingId: booking._id,
        reason,
        details: details.trim(),
        block,
      });
      toast(response.data.message, "ok");
      onDone(response.data);
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Report ${booking.customer?.name || "this customer"}`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted" style={{ marginBottom: 10 }}>
          This goes to the Women Skill team only. The customer is not told who reported them.
        </p>
        <label className="field">
          <span>What happened?</span>
          <select value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }}>
            <option value="">Choose a reason</option>
            {REPORT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {serious ? (
          <div className="note note-warn" style={{ marginBottom: 12 }}>
            If you are in danger right now, press <strong>SOS</strong> or call <a href="tel:112"><strong>112</strong></a>.
            The team is alerted by email about this report straight away.
          </div>
        ) : null}
        <label className="field">
          <span>Details</span>
          <textarea value={details} onChange={(e) => { setDetails(e.target.value); setError(""); }} maxLength={1500} placeholder="What happened, when, and anything the team should know." />
        </label>
        <label className="check-field">
          <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} />
          <span>Also block this customer from booking me</span>
        </label>
        {error ? <p className="error-text" role="alert" style={{ marginBottom: 10 }}>{error}</p> : null}
        <div className="cluster" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-line" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" type="submit" disabled={busy}>{busy ? "Sending…" : "Send report"}</button>
        </div>
      </form>
    </Modal>
  );
}
