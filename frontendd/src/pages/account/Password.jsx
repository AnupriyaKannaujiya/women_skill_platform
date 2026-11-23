import { useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { usePageTitle } from "../../lib/usePageTitle";
import { getError } from "../../lib/format";

function Password() {
  usePageTitle("Password");
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Any edit clears the previous validation message, so it never lingers after a fix.
  const update = (event) => {
    setError("");
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const mismatch = form.confirm !== "" && form.newPassword !== form.confirm;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.currentPassword || form.newPassword.length < 6) {
      setError("Enter your current password and a new one of at least 6 characters.");
      return;
    }
    if (form.newPassword !== form.confirm) {
      // A typed-but-different confirm already shows its own hint under the field.
      if (!form.confirm) setError("Type the new password again to confirm it.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await api.put("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast(response.data.message || "Password changed.", "ok");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (error) {
      toast(getError(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 560 }}>
      <p className="eyebrow">Account</p>
      <h1 className="section-title" style={{ margin: "8px 0 16px" }}>Change password</h1>
      <label className="field">
        <span>Current password</span>
        <input name="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={update} />
      </label>
      <label className="field">
        <span>New password</span>
        <input name="newPassword" type="password" autoComplete="new-password" value={form.newPassword} onChange={update} />
      </label>
      <label className="field">
        <span>Confirm new password</span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update}
          aria-invalid={mismatch}
        />
        {mismatch ? <span className="error-text">Does not match the new password yet.</span> : null}
      </label>
      {error ? <p className="error-text" role="alert" style={{ marginBottom: 12 }}>{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export default Password;
