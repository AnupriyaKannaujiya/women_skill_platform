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

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.currentPassword || form.newPassword.length < 6) {
      toast("Enter your current password and a new one of at least 6 characters.", "error");
      return;
    }
    if (form.newPassword !== form.confirm) {
      toast("The new passwords do not match.", "error");
      return;
    }
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
        <input name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={update} />
      </label>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export default Password;
