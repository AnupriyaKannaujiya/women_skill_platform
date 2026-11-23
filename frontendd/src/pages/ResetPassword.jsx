import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { usePageTitle } from "../lib/usePageTitle";
import { getError } from "../lib/format";

function ResetPassword() {
  usePageTitle("Choose a new password");
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { logout } = useAuth();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (event) => {
    setError("");
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const mismatch = form.confirm !== "" && form.password !== form.confirm;

  const submit = async (event) => {
    event.preventDefault();
    if (form.password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      if (!form.confirm) setError("Type the new password again to confirm it.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password: form.password });
      // Any session open in this browser belongs to the old password.
      logout();
      toast(response.data.message || "Password reset. Please log in.", "ok");
      navigate("/login", { replace: true, state: { email: response.data.email } });
    } catch (err) {
      if (err?.response?.status === 400 && !err.response.data?.errors) setExpired(true);
      setError(getError(err, "Could not reset the password. Please try again."));
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
            A fresh start.
          </h1>
          <p style={{ marginTop: 12, maxWidth: "28rem", color: "rgba(246,241,234,0.8)" }}>
            Pick a new password. You will be signed out on other devices, and can log in again right away.
          </p>
        </div>
        <p>Use something you have not used here before.</p>
      </section>
      <section className="auth-panel">
        {expired ? (
          <div className="auth-card" role="alert">
            <p className="eyebrow">Link not valid</p>
            <h2 className="section-title" style={{ margin: "8px 0 12px" }}>This link has expired</h2>
            <p className="muted">{error}</p>
            <div className="cluster" style={{ marginTop: 18 }}>
              <Link className="btn btn-primary" to="/forgot-password">Get a new link</Link>
              <Link className="btn btn-line" to="/login">Back to log in</Link>
            </div>
          </div>
        ) : (
          <form className="auth-card" onSubmit={submit} noValidate>
            <p className="eyebrow">Reset password</p>
            <h2 className="section-title" style={{ margin: "8px 0 18px" }}>Choose a new password</h2>
            <label className="field">
              <span>New password</span>
              <input
                name="password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={update}
                autoFocus
              />
              <span className="help">At least 6 characters.</span>
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input
                name="confirm"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={form.confirm}
                onChange={update}
                aria-invalid={mismatch}
              />
              {mismatch ? <span className="error-text">Does not match the new password yet.</span> : null}
            </label>
            <div className="check-row">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShow((value) => !value)}>
                {show ? "Hide passwords" : "Show passwords"}
              </button>
            </div>
            {error ? <p className="error-text" role="alert" style={{ marginBottom: 12 }}>{error}</p> : null}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

export default ResetPassword;
