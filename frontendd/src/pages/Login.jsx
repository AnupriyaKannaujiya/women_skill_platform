import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import api from "../lib/api";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { usePageTitle } from "../lib/usePageTitle";
import { getError, homeFor } from "../lib/format";

function Login() {
  usePageTitle("Log in");
  const navigate = useNavigate();
  const location = useLocation();
  const { login, token, user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (token && user) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: "" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.email.trim()) next.email = "Email is required.";
    if (!form.password) next.password = "Password is required.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });
      login(response.data.token, response.data.user);
      toast("You are logged in.", "ok");
      const from = location.state?.from?.pathname;
      navigate(from || homeFor(response.data.user.role), { replace: true });
    } catch (error) {
      toast(getError(error), "error");
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
            Welcome back.
          </h1>
          <p style={{ marginTop: 12, maxWidth: "28rem", color: "rgba(246,241,234,0.8)" }}>
            Customers see their requests. Providers accept the work. Admins watch the whole board.
          </p>
        </div>
        <p>New here? Create an account on the next screen.</p>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <p className="eyebrow">Log in</p>
          <h2 className="section-title" style={{ margin: "8px 0 18px" }}>
            Your account
          </h2>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" value={form.email} onChange={update} />
            {errors.email ? <span className="error-text">{errors.email}</span> : null}
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={update}
            />
            {errors.password ? <span className="error-text">{errors.password}</span> : null}
          </label>
          <div className="check-row">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShow((value) => !value)}>
              {show ? "Hide password" : "Show password"}
            </button>
            <span className="help">Reset by email is not available yet.</span>
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
          <p style={{ marginTop: 16 }}>
            No account? <Link to="/register">Join Women Skill</Link>
          </p>
        </form>
      </section>
    </div>
  );
}

export default Login;
