import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Loading } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { useProviderSettings } from "../../lib/useProviderSettings";
import { formatDate, getError } from "../../lib/format";
import { mapsLink } from "../../lib/geo";

const blankContact = { name: "", phone: "", email: "", relation: "" };

function SafetyForm({ initial, save, saving }) {
  const toast = useToast();
  const [contacts, setContacts] = useState(initial.emergencyContacts.length ? initial.emergencyContacts : [{ ...blankContact }]);
  const [nearby, setNearby] = useState(initial.sosNearbyAlerts);
  const [verifiedOnly, setVerifiedOnly] = useState(initial.requireVerifiedCustomers);
  const [error, setError] = useState("");

  const setContact = (index, key, value) =>
    setContacts((list) => list.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const result = await save({
      emergencyContacts: contacts.filter((item) => item.name || item.phone || item.email),
      sosNearbyAlerts: nearby,
      requireVerifiedCustomers: verifiedOnly,
    });
    if (result.ok) toast("Safety settings saved.", "ok");
    else setError(result.message);
  };

  return (
    <form onSubmit={submit} noValidate>
      <section className="card" style={{ marginBottom: 14 }}>
        <h2>Emergency contacts</h2>
        <p className="muted" style={{ margin: "4px 0 12px" }}>
          When you press SOS they get an email with your location (if an email is given), and your phone shows
          one-tap Call / WhatsApp / SMS buttons for each of them.
        </p>
        {contacts.map((item, index) => (
          <div className="contact-row" key={index}>
            <input aria-label="Contact name" placeholder="Name" value={item.name} onChange={(e) => setContact(index, "name", e.target.value)} maxLength={60} />
            <input aria-label="Relation" placeholder="Relation, e.g. Sister" value={item.relation} onChange={(e) => setContact(index, "relation", e.target.value)} maxLength={30} />
            <input aria-label="Contact phone" placeholder="Phone" inputMode="tel" value={item.phone} onChange={(e) => setContact(index, "phone", e.target.value)} maxLength={20} />
            <input aria-label="Contact email" placeholder="Email (optional)" type="email" value={item.email} onChange={(e) => setContact(index, "email", e.target.value)} maxLength={120} />
            <button className="icon-btn" type="button" aria-label="Remove contact" onClick={() => setContacts((list) => list.filter((_, i) => i !== index))}>×</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" type="button" disabled={contacts.length >= 3} onClick={() => setContacts((list) => [...list, { ...blankContact }])}>
          + Add contact
        </button>
      </section>

      <section className="card" style={{ marginBottom: 14 }}>
        <h2>Who you work with</h2>
        <label className="check-field" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
          <span>Only accept bookings from customers whose ID is verified</span>
        </label>
        <p className="help" style={{ marginTop: -6, marginBottom: 12 }}>
          Every customer must add a phone number before booking. Verified customers show a ✓ on your requests.
        </p>
        <label className="check-field">
          <input type="checkbox" checked={nearby} onChange={(e) => setNearby(e.target.checked)} />
          <span>Alert me when a provider within 5 km of my base presses SOS</span>
        </label>
      </section>

      {error ? <p className="error-text" role="alert" style={{ marginBottom: 12 }}>{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save safety settings"}</button>
    </form>
  );
}

function SosHistory() {
  const toast = useToast();
  const [alerts, setAlerts] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.get("/sos/mine").then((response) => setAlerts(response.data.alerts || [])).catch(() => setAlerts([]));
  }, [version]);

  const resolve = async (id) => {
    try {
      await api.put(`/sos/${id}/resolve`, { note: "She marked herself safe" });
      toast("Marked safe. Everyone alerted has been told.", "ok");
      setVersion((v) => v + 1);
    } catch (err) {
      toast(getError(err), "error");
    }
  };

  if (!alerts) return <Loading label="Loading alerts" />;
  if (!alerts.length) return <p className="muted">You have not raised any SOS alerts.</p>;
  return alerts.map((alert) => (
    <div className="booking" key={alert._id}>
      <div className="booking-head">
        <strong>{formatDate(alert.createdAt)}</strong>
        <span className={alert.status === "active" ? "badge badge-rejected" : "badge badge-accepted"}>
          {alert.status === "active" ? "active" : "resolved"}
        </span>
      </div>
      <p className="help" style={{ margin: "6px 0" }}>
        Told: {alert.notified?.admins || 0} admin · {alert.notified?.contacts || 0} contact(s) · {alert.notified?.nearby || 0} nearby provider(s)
        {alert.location ? <> · <a href={mapsLink(alert.location)} target="_blank" rel="noreferrer">location</a></> : null}
      </p>
      {alert.status === "active" ? (
        <button className="btn btn-sage btn-sm" type="button" onClick={() => resolve(alert._id)}>I'm safe now</button>
      ) : (
        <p className="help">{alert.resolutionNote}</p>
      )}
    </div>
  ));
}

const REPORT_STATUS = {
  open: ["badge badge-pending", "With the team"],
  resolved: ["badge badge-accepted", "Action taken"],
  dismissed: ["badge badge-cancelled", "Closed"],
};
const ACTION_TEXT = { warned: "Customer was warned", blocked: "Customer was blocked", none: "" };

function BlockedAndReports() {
  const toast = useToast();
  const [blocked, setBlocked] = useState(null);
  const [reports, setReports] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.get("/customer-feedback/blocked").then((r) => setBlocked(r.data.customers || [])).catch(() => setBlocked([]));
    api.get("/customer-feedback/reports/mine").then((r) => setReports(r.data.reports || [])).catch(() => setReports([]));
  }, [version]);

  const unblock = async (customer) => {
    try {
      await api.delete(`/customer-feedback/blocked/${customer._id}`);
      toast(`${customer.name} can book you again.`, "ok");
      setVersion((v) => v + 1);
    } catch (err) {
      toast(getError(err), "error");
    }
  };

  return (
    <>
      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 6 }}>Blocked customers</h2>
        <p className="muted" style={{ marginBottom: 10 }}>
          They cannot book you and are not told why. Block someone from "Report customer" on any booking.
        </p>
        {!blocked ? (
          <Loading label="Loading" />
        ) : blocked.length ? (
          blocked.map((customer) => (
            <div className="split blocked-row" key={customer._id}>
              <span><strong>{customer.name}</strong>{customer.city ? <span className="muted"> · {customer.city}</span> : null}</span>
              <button className="btn btn-line btn-sm" type="button" onClick={() => unblock(customer)}>Unblock</button>
            </div>
          ))
        ) : (
          <p className="muted">You have not blocked anyone.</p>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Your reports</h2>
        {!reports ? (
          <Loading label="Loading" />
        ) : reports.length ? (
          reports.map((report) => {
            const [cls, label] = REPORT_STATUS[report.status] || REPORT_STATUS.open;
            return (
              <div className="split blocked-row" key={report._id}>
                <span>
                  <strong>{report.customer?.name || "Customer"}</strong>
                  <span className="muted"> · {formatDate(report.createdAt)}</span>
                  {ACTION_TEXT[report.action] ? <span className="help" style={{ display: "block" }}>{ACTION_TEXT[report.action]}</span> : null}
                </span>
                <span className={cls}>{label}</span>
              </div>
            );
          })
        ) : (
          <p className="muted">You have not reported anyone.</p>
        )}
      </section>
    </>
  );
}

function Safety() {
  usePageTitle("Safety");
  const { settings, error, saving, save } = useProviderSettings();
  return (
    <div style={{ maxWidth: 760 }}>
      <p className="eyebrow">Provider</p>
      <h1 className="section-title" style={{ margin: "8px 0 8px" }}>Safety</h1>
      <div className="note" style={{ marginBottom: 16 }}>
        <strong>In danger?</strong> Press the red <strong>SOS</strong> button at the bottom of any screen. It alerts the
        Women Skill team, your emergency contacts and providers near you, with your live location. For police, call{" "}
        <a href="tel:112"><strong>112</strong></a>.
      </div>
      <div className="note" style={{ marginBottom: 16 }}>
        <strong>On a home visit:</strong> tap <em>I've arrived</em> when you reach, and <em>I've left safely</em> when
        you leave. If you have not checked out an hour after the booking ends, you and the team are alerted.
      </div>
      {error ? <div className="note note-error">{error}</div> : null}
      {settings ? <SafetyForm initial={settings} save={save} saving={saving} /> : !error ? <Loading label="Loading" /> : null}
      <BlockedAndReports />
      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Your SOS alerts</h2>
        <SosHistory />
      </section>
    </div>
  );
}

export default Safety;
