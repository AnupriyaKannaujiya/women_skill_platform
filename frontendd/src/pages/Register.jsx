import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import Brand from "../components/Brand";
import { useToast } from "../context/ToastContext";
import { usePageTitle } from "../lib/usePageTitle";
import { getError, textToSkills } from "../lib/format";

const blank = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "customer",
  skill: "",
  city: "",
  area: "",
  whatsapp: "",
  experience: "",
  price: "",
  description: "",
};

function Register() {
  usePageTitle("Join");
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    if (form.password.length < 6) next.password = "Use at least 6 characters.";
    if (form.role === "provider" && textToSkills(form.skill).length === 0) {
      next.skill = "Add at least one skill.";
    }
    if (form.role === "provider" && !form.city.trim()) next.city = "City helps people find you.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim(),
      role: form.role,
    };

    if (form.role === "provider") {
      payload.skill = textToSkills(form.skill);
      payload.city = form.city.trim();
      payload.area = form.area.trim();
      payload.whatsapp = form.whatsapp.trim();
      payload.description = form.description.trim();
      if (form.experience !== "") payload.experience = Number(form.experience);
      if (form.price !== "") payload.price = Number(form.price);
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/register", payload);
      toast(response.data.message || "Account created.", "ok");
      navigate("/login");
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
            {form.role === "provider" ? "Offer your skill." : "Book someone nearby."}
          </h1>
          <p style={{ marginTop: 12, maxWidth: "28rem", color: "rgba(246,241,234,0.8)" }}>
            {form.role === "provider"
              ? "Your name, city and price are what customers search. You can add photos after you log in."
              : "A customer account can request work, follow the status, and review it when it is done."}
          </p>
        </div>
        <p>Already joined? Log in with the same email.</p>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="role-switch" role="tablist" aria-label="Account type">
            <button type="button" aria-selected={form.role === "customer"} onClick={() => setForm((current) => ({ ...current, role: "customer" }))}>
              I need work done
            </button>
            <button type="button" aria-selected={form.role === "provider"} onClick={() => setForm((current) => ({ ...current, role: "provider" }))}>
              I offer a skill
            </button>
          </div>
          <label className="field">
            <span>Full name</span>
            <input name="name" value={form.name} onChange={update} />
            {errors.name ? <span className="error-text">{errors.name}</span> : null}
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" value={form.email} onChange={update} />
            {errors.email ? <span className="error-text">{errors.email}</span> : null}
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type={show ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={update} />
            {errors.password ? <span className="error-text">{errors.password}</span> : null}
          </label>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShow((value) => !value)}>
            {show ? "Hide password" : "Show password"}
          </button>
          <label className="field">
            <span>Phone</span>
            <input name="phone" value={form.phone} onChange={update} />
          </label>
          {form.role === "provider" ? (
            <>
              <label className="field">
                <span>Skills <em className="help">separate with commas</em></span>
                <input name="skill" placeholder="Mehndi, Bridal makeup" value={form.skill} onChange={update} />
                {errors.skill ? <span className="error-text">{errors.skill}</span> : null}
              </label>
              <div className="field-row">
                <label className="field">
                  <span>City</span>
                  <input name="city" value={form.city} onChange={update} />
                  {errors.city ? <span className="error-text">{errors.city}</span> : null}
                </label>
                <label className="field">
                  <span>Area</span>
                  <input name="area" value={form.area} onChange={update} />
                </label>
              </div>
              <label className="field">
                <span>WhatsApp</span>
                <input name="whatsapp" value={form.whatsapp} onChange={update} />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Experience (years)</span>
                  <input name="experience" type="number" min="0" value={form.experience} onChange={update} />
                </label>
                <label className="field">
                  <span>Starting price (₹)</span>
                  <input name="price" type="number" min="0" value={form.price} onChange={update} />
                </label>
              </div>
              <label className="field">
                <span>About your work</span>
                <textarea name="description" value={form.description} onChange={update} />
              </label>
            </>
          ) : null}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
          <p style={{ marginTop: 16 }}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </section>
    </div>
  );
}

export default Register;
