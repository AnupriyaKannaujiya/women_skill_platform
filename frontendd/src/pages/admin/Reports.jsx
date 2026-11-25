import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Empty, Loading, Modal } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { formatDate, getError, phoneHref } from "../../lib/format";

const TABS = ["open", "resolved", "dismissed"];
const DECISIONS = {
  warn: { title: "Send the customer a warning?", label: "Send warning", danger: false, hint: "They get an in-app and email warning. Your note is included." },
  block: { title: "Block this customer from Women Skill?", label: "Block customer", danger: true, hint: "They are signed out and cannot log in or book anyone until an admin unblocks them." },
  dismiss: { title: "Dismiss this report?", label: "Dismiss", danger: false, hint: "No action is taken against the customer. A short note is required." },
  resolve: { title: "Close without action?", label: "Close", danger: false, hint: "Use when the matter was handled another way (e.g. by phone)." },
};

function AdminReports() {
  usePageTitle("Customer reports");
  const toast = useToast();
  const [tab, setTab] = useState("open");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [acting, setActing] = useState(null); // { report, decision }
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/reports", { params: { status: tab } })
      .then((response) => {
        if (!cancelled) setData(response.data);
      })
      .catch((err) => {
        if (!cancelled) setError(getError(err, "Could not load reports."));
      });
    return () => {
      cancelled = true;
    };
  }, [tab, version]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.put(`/admin/reports/${acting.report._id}`, { decision: acting.decision, adminNote: note.trim() });
      toast(response.data.message, "ok");
      setActing(null);
      setNote("");
      setVersion((v) => v + 1);
    } catch (err) {
      toast(getError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!data && !error) return <Loading label="Loading reports" />;
  const reasons = data?.reasons || {};

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="section-title" style={{ margin: "8px 0 6px" }}>Customer reports</h1>
      <p className="muted" style={{ marginBottom: 14 }}>
        Reports from providers about customers. Safety reports (harassment, unsafe) are listed first.
      </p>
      {error ? <div className="note note-error">{error}</div> : null}

      <div className="chip-row" role="tablist" style={{ marginBottom: 14 }}>
        {TABS.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "chip active" : "chip"} onClick={() => setTab(item)}>
            {item}
            <span className="count">{data?.counts?.[item] ?? 0}</span>
          </button>
        ))}
      </div>

      {data?.reports?.length ? (
        data.reports.map((report) => {
          const customer = report.customer || {};
          const booking = report.booking;
          return (
            <article className={report.serious && report.status === "open" ? "booking sos-card" : "booking"} key={report._id}>
              <div className="booking-head">
                <div>
                  <h3>
                    {report.serious ? "⚠️ " : ""}
                    {reasons[report.reason] || report.reason}
                  </h3>
                  <p className="muted">
                    {report.reporter?.name || "Provider"} reported <strong>{customer.name || "a customer"}</strong> · {formatDate(report.createdAt)}
                  </p>
                </div>
                <span className={`badge ${report.status === "open" ? "badge-pending" : report.status === "resolved" ? "badge-accepted" : "badge-cancelled"}`}>
                  {report.status === "resolved" ? report.action : report.status}
                </span>
              </div>
              <p style={{ margin: "10px 0", whiteSpace: "pre-wrap" }}>“{report.details}”</p>
              <dl className="meta-grid">
                <div>
                  <dt>Customer</dt>
                  <dd>
                    {customer.name} {customer.isVerified ? "✓" : "(ID not verified)"}
                    {customer.isBlocked ? <span className="badge badge-rejected" style={{ marginLeft: 6 }}>blocked</span> : null}
                    <span className="help" style={{ display: "block" }}>
                      {customer.email}
                      {customer.phone ? <> · <a href={phoneHref(customer.phone)}>{customer.phone}</a></> : null}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>History</dt>
                  <dd>
                    Reported by {report.history?.reporters || 1} provider{(report.history?.reporters || 1) === 1 ? "" : "s"} ({report.history?.total || 1} report{(report.history?.total || 1) === 1 ? "" : "s"})
                    <span className="help" style={{ display: "block" }}>
                      {customer.customerRatingCount ? `★ ${customer.customerRating} from ${customer.customerRatingCount} rating(s)` : "No provider ratings"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Booking</dt>
                  <dd>{booking ? `${booking.service} · ${booking.serviceMode === "at_provider" ? "at her place" : booking.address} · ${formatDate(booking.bookingDate)} (${booking.status})` : "—"}</dd>
                </div>
                <div>
                  <dt>Reporter</dt>
                  <dd>
                    {report.reporter?.name}
                    {report.reporter?.phone ? <> · <a href={phoneHref(report.reporter.phone)}>{report.reporter.phone}</a></> : null}
                  </dd>
                </div>
              </dl>
              {report.status === "open" ? (
                <div className="cluster">
                  <button className="btn btn-primary btn-sm" type="button" onClick={() => { setNote(""); setActing({ report, decision: "warn" }); }}>Warn customer</button>
                  <button className="btn btn-danger btn-sm" type="button" disabled={customer.isBlocked} onClick={() => { setNote(""); setActing({ report, decision: "block" }); }}>Block customer</button>
                  <button className="btn btn-line btn-sm" type="button" onClick={() => { setNote(""); setActing({ report, decision: "resolve" }); }}>Close</button>
                  <button className="btn btn-line btn-sm" type="button" onClick={() => { setNote(""); setActing({ report, decision: "dismiss" }); }}>Dismiss</button>
                </div>
              ) : (
                <p className="help">
                  {formatDate(report.resolvedAt)}{report.resolvedBy?.name ? ` by ${report.resolvedBy.name}` : ""}
                  {report.adminNote ? ` · ${report.adminNote}` : ""}
                </p>
              )}
            </article>
          );
        })
      ) : (
        <Empty title={tab === "open" ? "No open reports" : `No ${tab} reports`} text={tab === "open" ? "Nothing waiting for review." : "Pick another tab."} />
      )}

      {acting ? (
        <Modal title={DECISIONS[acting.decision].title} onClose={() => setActing(null)}>
          <form onSubmit={submit}>
            <p className="muted" style={{ marginBottom: 10 }}>{DECISIONS[acting.decision].hint}</p>
            <label className="field">
              <span>Note {acting.decision === "dismiss" ? "(required)" : <em className="help">optional</em>}</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={acting.decision === "warn" ? "Shown to the customer" : "Kept on record; shared with the provider"} autoFocus />
            </label>
            <div className="cluster" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-line" type="button" onClick={() => setActing(null)} disabled={busy}>Cancel</button>
              <button
                className={DECISIONS[acting.decision].danger ? "btn btn-danger" : "btn btn-primary"}
                type="submit"
                disabled={busy || (acting.decision === "dismiss" && !note.trim())}
              >
                {busy ? "Please wait…" : DECISIONS[acting.decision].label}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

export default AdminReports;
