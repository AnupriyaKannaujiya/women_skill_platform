import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Empty, Loading, Modal } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { formatDate, getError, phoneHref } from "../../lib/format";
import { mapsLink } from "../../lib/geo";

const REFRESH_MS = 20 * 1000;

function AdminSos() {
  usePageTitle("SOS alerts");
  const toast = useToast();
  const [tab, setTab] = useState("active");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [closing, setClosing] = useState(null);
  const [note, setNote] = useState("");

  // Active alerts refresh on their own, so a new SOS shows up without reloading.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api
        .get("/sos/admin", { params: { status: tab } })
        .then((response) => {
          if (!cancelled) setData(response.data);
        })
        .catch((err) => {
          if (!cancelled) setError(getError(err, "Could not load alerts."));
        });
    load();
    const timer = tab === "active" ? window.setInterval(load, REFRESH_MS) : null;
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [tab, version]);

  const close = async (event) => {
    event.preventDefault();
    try {
      await api.put(`/sos/${closing._id}/resolve`, { note: note.trim() || "Closed by admin" });
      toast("Alert closed. She has been told.", "ok");
      setClosing(null);
      setNote("");
      setVersion((v) => v + 1);
    } catch (err) {
      toast(getError(err), "error");
    }
  };

  if (!data && !error) return <Loading label="Loading alerts" />;

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="section-title" style={{ margin: "8px 0 6px" }}>SOS alerts</h1>
      <p className="muted" style={{ marginBottom: 14 }}>
        Call her first. If you cannot reach her, call 112 with her location and the booking address.
      </p>
      {error ? <div className="note note-error">{error}</div> : null}

      <div className="chip-row" role="tablist" style={{ marginBottom: 14 }}>
        {["active", "resolved"].map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "chip active" : "chip"} onClick={() => setTab(item)}>
            {item}
            <span className="count">{data?.counts?.[item] ?? 0}</span>
          </button>
        ))}
      </div>

      {data?.alerts?.length ? (
        data.alerts.map((alert) => {
          const p = alert.provider || {};
          const b = alert.booking;
          return (
            <article className={alert.status === "active" ? "booking sos-card" : "booking"} key={alert._id}>
              <div className="booking-head">
                <div>
                  <h3>🚨 {p.name || "Provider"}</h3>
                  <p className="muted">{formatDate(alert.createdAt)} · {[p.area, p.city].filter(Boolean).join(", ")}</p>
                </div>
                <span className={alert.status === "active" ? "badge badge-rejected" : "badge badge-accepted"}>{alert.status}</span>
              </div>
              {alert.message ? <p style={{ margin: "8px 0" }}>“{alert.message}”</p> : null}
              <dl className="meta-grid">
                <div><dt>Her phone</dt><dd>{p.phone ? <a href={phoneHref(p.phone)}>{p.phone}</a> : "—"}</dd></div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {alert.location?.lat ? (
                      <a href={mapsLink(alert.location)} target="_blank" rel="noreferrer">Open map{alert.location.accuracy ? ` (±${alert.location.accuracy} m)` : ""}</a>
                    ) : "Not shared"}
                  </dd>
                </div>
                <div>
                  <dt>Booking</dt>
                  <dd>
                    {b ? `${b.service} · ${b.serviceMode === "at_provider" ? "at her place" : b.address} · ${formatDate(b.bookingDate)}${b.checkInAt ? " · checked in" : ""}` : "None linked"}
                  </dd>
                </div>
                <div>
                  <dt>Customer</dt>
                  <dd>
                    {b?.customer ? (
                      <>
                        {b.customer.name} {b.customer.isVerified ? "✓" : "(ID not verified)"}
                        {b.customer.phone ? <> · <a href={phoneHref(b.customer.phone)}>{b.customer.phone}</a></> : null}
                      </>
                    ) : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Emergency contacts</dt>
                  <dd>
                    {(p.emergencyContacts || []).length
                      ? p.emergencyContacts.map((c) => (
                          <span key={c.phone} style={{ display: "block" }}>
                            {c.name}{c.relation ? ` (${c.relation})` : ""} · <a href={phoneHref(c.phone)}>{c.phone}</a>
                          </span>
                        ))
                      : "None added"}
                  </dd>
                </div>
                <div><dt>Alerted</dt><dd>{alert.notified?.contacts || 0} contact(s), {alert.notified?.nearby || 0} nearby provider(s)</dd></div>
              </dl>
              {alert.status === "active" ? (
                <div className="cluster">
                  {p.phone ? <a className="btn btn-primary btn-sm" href={phoneHref(p.phone)}>📞 Call her</a> : null}
                  <a className="btn btn-danger btn-sm" href="tel:112">Call 112</a>
                  <button className="btn btn-line btn-sm" type="button" onClick={() => setClosing(alert)}>Close alert</button>
                </div>
              ) : (
                <p className="help">Closed {formatDate(alert.resolvedAt)}{alert.resolvedBy?.name ? ` by ${alert.resolvedBy.name}` : ""}: {alert.resolutionNote}</p>
              )}
            </article>
          );
        })
      ) : (
        <Empty title={tab === "active" ? "No active alerts" : "No closed alerts"} text={tab === "active" ? "Everyone is safe right now." : "Closed alerts show here."} />
      )}

      {closing ? (
        <Modal title={`Close ${closing.provider?.name || "this"} alert?`} onClose={() => setClosing(null)}>
          <form onSubmit={close}>
            <label className="field">
              <span>What happened? <em className="help">kept on record</em></span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Called her, she is safe at home." autoFocus />
            </label>
            <div className="cluster" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-line" type="button" onClick={() => setClosing(null)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Close alert</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

export default AdminSos;
