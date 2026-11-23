import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../lib/api";
import Brand from "../components/Brand";
import { usePageTitle } from "../lib/usePageTitle";
import { getError } from "../lib/format";

function ForgotPassword() {
  usePageTitle("Forgot password");
  const location = useLocation();
  // The login page passes along whatever email was already typed.
  const [email, setEmail] = useState(() => location.state?.email || "");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError("Enter the email you signed up with.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", { email: value });
      setSent(response.data.message || "If an account exists for that email, a reset link is on its way.");
    } catch (err) {
      setError(getError(err, "Could not send the reset link. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-copy">
        <Brand />
        <div>
          <h1 className="display" style={{ fontSize: "clamp(2.4rem, 4vw, 3.6rem)" }}>
            Locked out?
          </h1>
          <p style={{ marginTop: 12, maxWidth: "28rem", color: "rgba(246,241,234,0.8)" }}>
            Tell us your email. We will send a link to choose a new password. The link works for 30 minutes.
          </p>
        </div>
        <p>Remembered it? Go back and log in.</p>
      </section>
      <section className="auth-panel">
        {sent ? (
          <div className="auth-card" role="status">
            <p className="eyebrow">Check your inbox</p>
            <h2 className="section-title" style={{ margin: "8px 0 12px" }}>Link sent</h2>
            <p className="muted">{sent}</p>
            <p className="help" style={{ marginTop: 10 }}>
              Not there after a few minutes? Look in spam, or try again.
            </p>
            <div className="cluster" style={{ marginTop: 18 }}>
              <Link className="btn btn-primary" to="/login" state={{ email: email.trim() }}>Back to log in</Link>
              <button className="btn btn-line" type="button" onClick={() => setSent("")}>Send again</button>
            </div>
          </div>
        ) : (
          <form className="auth-card" onSubmit={submit} noValidate>
            <p className="eyebrow">Forgot password</p>
            <h2 className="section-title" style={{ margin: "8px 0 18px" }}>Reset by email</h2>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                autoFocus
              />
              {error ? <span className="error-text" role="alert">{error}</span> : null}
            </label>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <p style={{ marginTop: 16 }}>
              <Link to="/login">Back to log in</Link>
            </p>
          </form>
        )}
      </section>
    </div>
  );
}

export default ForgotPassword;
