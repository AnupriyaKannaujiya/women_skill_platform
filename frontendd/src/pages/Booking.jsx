import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import { Loading } from "../components/ui";
import { usePageTitle } from "../lib/usePageTitle";
import { getError, localDateTimeValue, skillList } from "../lib/format";

function Booking() {
  usePageTitle("Request a booking");
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [provider, setProvider] = useState(null);
  const [form, setForm] = useState({
    service: "",
    customService: "",
    bookingDate: "",
    address: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/users/${id}`)
      .then((response) => {
        if (!cancelled) setProvider(response.data.user);
      })
      .catch((err) => {
        if (!cancelled) setError(getError(err, "Provider not found."));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const skills = skillList(provider?.skill);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const service = form.service === "other" ? form.customService.trim() : form.service.trim();
    if (!service || !form.bookingDate || !form.address.trim()) {
      setError("Service, date and address are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/bookings", {
        provider: id,
        service,
        bookingDate: form.bookingDate,
        address: form.address.trim(),
        message: form.message.trim(),
      });
      toast(response.data.message || "Request sent.", "ok");
      setDone(true);
    } catch (err) {
      toast(getError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  if (error && !provider) {
    return (
      <div className="note note-error">{error}</div>
    );
  }
  if (!provider) return <Loading label="Loading provider" />;

  if (done) {
    return (
      <div className="card">
        <p className="eyebrow">Request sent</p>
        <h1 className="section-title" style={{ margin: "8px 0 10px" }}>
          {provider.name} has your request.
        </h1>
        <p className="lead">It stays pending until she accepts or rejects it. You can follow it from your bookings.</p>
        <Link className="btn btn-primary" style={{ marginTop: 16 }} to="/customer/dashboard">
          Go to my bookings
        </Link>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 680 }}>
      <p className="eyebrow">Booking</p>
      <h1 className="section-title" style={{ margin: "8px 0 8px" }}>
        Request {provider.name}
      </h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        {[provider.area, provider.city].filter(Boolean).join(", ")}
      </p>
      <label className="field">
        <span>Service</span>
        {skills.length ? (
          <select name="service" value={form.service} onChange={update}>
            <option value="">Choose a skill</option>
            {skills.map((skill) => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
            <option value="other">Something else</option>
          </select>
        ) : (
          <input name="service" value={form.service} onChange={update} placeholder="What do you need?" />
        )}
      </label>
      {form.service === "other" ? (
        <label className="field">
          <span>Describe the service</span>
          <input name="customService" value={form.customService} onChange={update} />
        </label>
      ) : null}
      <label className="field">
        <span>Date and time</span>
        <input name="bookingDate" type="datetime-local" min={localDateTimeValue()} value={form.bookingDate} onChange={update} />
      </label>
      <label className="field">
        <span>Address</span>
        <textarea name="address" value={form.address} onChange={update} placeholder="House, street, area" />
      </label>
      <label className="field">
        <span>Message <em className="help">optional</em></span>
        <textarea name="message" value={form.message} onChange={update} />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="cluster">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send request"}
        </button>
        <button className="btn btn-line" type="button" onClick={() => navigate(`/providers/${id}`)}>
          Back to profile
        </button>
      </div>
    </form>
  );
}

export default Booking;
