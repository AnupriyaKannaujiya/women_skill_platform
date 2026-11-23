import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "../context/AuthContext";

function Contact() {
  usePageTitle("Contact");
  const { token, user } = useAuth();
  const signedIn = Boolean(token && user);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      setError("Name and message are required.");
      return;
    }
    setError("");
    setSent(true);
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
            Customers reach a provider from her profile. Providers join with their own account. This page does not email anyone, because the server has no contact inbox yet.
          </p>
          <div className="cluster" style={{ marginTop: 18 }}>
            <Link className="btn btn-primary" to="/providers">Find a woman</Link>
            {signedIn ? null : <Link className="btn btn-line" to="/register">Join as a provider</Link>}
          </div>
        </div>
        <form className="card" onSubmit={submit}>
          <h2>Leave a note on this screen</h2>
          <p className="muted" style={{ margin: "6px 0 14px" }}>
            It stays in the browser only. Nothing is saved on the server.
          </p>
          <label className="field">
            <span>Name</span>
            <input name="name" value={form.name} onChange={update} />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={update} />
          </label>
          <label className="field">
            <span>Message</span>
            <textarea name="message" value={form.message} onChange={update} />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn btn-dark" type="submit">Keep this note</button>
          {sent ? (
            <div className="note" style={{ marginTop: 14 }}>
              Saved on this page only. Ask for a contact API if these notes should reach an inbox.
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

export default Contact;
