import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { getError } from "../lib/format";

const MAX_MESSAGE = 2000;

function Contact() {
  usePageTitle("Contact");
  const { token, user } = useAuth();
  const signedIn = Boolean(token && user);
  // A signed-in sender does not need to retype her name and email.
  const [form, setForm] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    message: "",
  }));
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const update = (event) => {
    setError("");
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      setError("Name and message are required.");
      return;
    }
    setSending(true);
    try {
      await api.post("/contact", {
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
      setSent(true);
      setForm((current) => ({ ...current, message: "" }));
    } catch (err) {
      setError(getError(err, "Your message could not be sent. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container page">
      <div className="profile-layout">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="section-title" style={{ margin: "8px 0 12px" }}>
            Need a person, or want to offer a skill?
          </h1>
          <p className="lead">
            Customers reach a provider from her profile. Providers join with their own account. For anything else —
            a problem with a booking, a report about a profile, or a question — write to the Women Skill team here.
          </p>
          <div className="cluster" style={{ marginTop: 18 }}>
            <Link className="btn btn-primary" to="/providers">Find a woman</Link>
            {signedIn ? null : <Link className="btn btn-line" to="/register">Join as a provider</Link>}
          </div>
        </div>
        {sent ? (
          <div className="card" role="status">
            <p className="eyebrow">Message sent</p>
            <h2 style={{ margin: "8px 0" }}>Thank you, {form.name.split(" ")[0] || "friend"}.</h2>
            <p className="muted">
              The team reads every message.{" "}
              {form.email ? `If a reply is needed, it will go to ${form.email}.` : "Add an email next time if you want a reply."}
            </p>
            <button className="btn btn-line" type="button" style={{ marginTop: 14 }} onClick={() => setSent(false)}>
              Send another message
            </button>
          </div>
        ) : (
          <form className="card" onSubmit={submit} noValidate>
            <h2>Write to us</h2>
            <p className="muted" style={{ margin: "6px 0 14px" }}>
              Goes straight to the admin inbox. Email is optional, but needed for a reply.
            </p>
            <label className="field">
              <span>Name</span>
              <input name="name" value={form.name} onChange={update} maxLength={80} autoComplete="name" />
            </label>
            <label className="field">
              <span>Email <em className="help">optional</em></span>
              <input name="email" type="email" value={form.email} onChange={update} maxLength={120} autoComplete="email" />
            </label>
            <label className="field">
              <span>Message</span>
              <textarea name="message" value={form.message} onChange={update} maxLength={MAX_MESSAGE} />
              <span className="help" style={{ alignSelf: "flex-end" }}>
                {form.message.length}/{MAX_MESSAGE}
              </span>
            </label>
            {error ? <p className="error-text" role="alert" style={{ marginBottom: 12 }}>{error}</p> : null}
            <button className="btn btn-dark" type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Contact;
