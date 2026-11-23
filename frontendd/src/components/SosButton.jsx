import { useState } from "react";
import api from "../lib/api";
import { getError } from "../lib/format";
import { getLocation } from "../lib/geo";
import { Modal } from "./ui";

// Always-visible emergency button for providers.
// Two taps (button, then "Send SOS now") so it is not triggered by accident,
// but nothing slower than that.
function SosButton() {
  const [stage, setStage] = useState("idle"); // idle | confirm | sending | sent | error
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [locationNote, setLocationNote] = useState("");

  const send = async () => {
    setStage("sending");
    setError("");
    let location = null;
    try {
      location = await getLocation({ timeout: 8000 });
      setLocationNote(`Location shared (±${location.accuracy} m).`);
    } catch (err) {
      // Never block the alert on location.
      setLocationNote(`${err.message} The alert was sent without live location.`);
    }
    try {
      const response = await api.post("/sos", { location, message: message.trim() || undefined });
      setResult(response.data);
      setStage("sent");
    } catch (err) {
      setError(getError(err, "The alert could not be sent. Call 112 now."));
      setStage("error");
    }
  };

  const markSafe = async () => {
    try {
      await api.put(`/sos/${result.alert._id}/resolve`, { note: "She marked herself safe" });
    } catch {
      // Closing the dialog still matters; the alert can also be closed from the Safety page.
    }
    setStage("idle");
    setResult(null);
    setMessage("");
  };

  return (
    <>
      <button className="sos-fab" type="button" onClick={() => setStage("confirm")} aria-label="SOS emergency alert">
        SOS
      </button>

      {stage === "confirm" ? (
        <Modal title="Send an SOS alert?" onClose={() => setStage("idle")}>
          <p style={{ marginBottom: 10 }}>
            The Women Skill team, your emergency contacts and providers near you will be alerted with your location and
            current booking.
          </p>
          <label className="field">
            <span>Short message <em className="help">optional</em></span>
            <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} placeholder="e.g. Customer is behaving badly, I need help" />
          </label>
          <div className="cluster" style={{ justifyContent: "space-between" }}>
            <a className="btn btn-line" href="tel:112">📞 Call 112</a>
            <button className="btn btn-danger" type="button" onClick={send} autoFocus>🚨 Send SOS now</button>
          </div>
        </Modal>
      ) : null}

      {stage === "sending" ? (
        <Modal title="Sending SOS…" onClose={() => {}}>
          <p>Getting your location and alerting help. Keep this screen open.</p>
        </Modal>
      ) : null}

      {stage === "error" ? (
        <Modal title="SOS not sent" onClose={() => setStage("idle")}>
          <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>
          <div className="cluster">
            <a className="btn btn-danger" href="tel:112">📞 Call 112</a>
            <button className="btn btn-line" type="button" onClick={send}>Try again</button>
          </div>
        </Modal>
      ) : null}

      {stage === "sent" && result ? (
        <Modal title="🚨 Help is being alerted" onClose={() => setStage("idle")}>
          <p style={{ marginBottom: 6 }}>
            Alerted: <strong>{result.notified.admins}</strong> team member(s), <strong>{result.notified.contacts}</strong> emergency
            contact(s), <strong>{result.notified.nearby}</strong> provider(s) nearby.
          </p>
          <p className="help" style={{ marginBottom: 12 }}>{locationNote}</p>
          <a className="btn btn-danger btn-block" href="tel:112" style={{ marginBottom: 10 }}>📞 Call 112 (Police / Emergency)</a>
          {result.contactLinks?.length ? (
            <div className="sos-contacts">
              {result.contactLinks.map((contact) => (
                <div className="sos-contact" key={contact.call}>
                  <strong>{contact.name}{contact.relation ? ` · ${contact.relation}` : ""}</strong>
                  <div className="cluster">
                    <a className="btn btn-line btn-sm" href={contact.call}>Call</a>
                    {contact.whatsapp ? <a className="btn btn-sage btn-sm" href={contact.whatsapp} target="_blank" rel="noreferrer">WhatsApp location</a> : null}
                    <a className="btn btn-line btn-sm" href={contact.sms}>SMS</a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="help">Add emergency contacts on the Safety page so they can be reached in one tap.</p>
          )}
          {result.mapsUrl ? (
            <p className="help" style={{ marginTop: 10 }}>
              Your location link: <a href={result.mapsUrl} target="_blank" rel="noreferrer">{result.mapsUrl}</a>
            </p>
          ) : null}
          <button className="btn btn-sage btn-block" type="button" onClick={markSafe} style={{ marginTop: 14 }}>
            ✅ I'm safe now — close the alert
          </button>
        </Modal>
      ) : null}
    </>
  );
}

export default SosButton;
