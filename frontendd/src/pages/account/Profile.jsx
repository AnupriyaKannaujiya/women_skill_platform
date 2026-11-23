import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Avatar, Loading } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { getError, skillsToText, textToSkills, unwrapUser } from "../../lib/format";

function Profile() {
  usePageTitle("Profile");
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const isProvider = user?.role === "provider";
  const [form, setForm] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/auth/profile")
      .then((response) => {
        const profile = unwrapUser(response.data);
        if (cancelled || !profile) return;
        setForm({
          name: profile.name || "",
          phone: profile.phone || "",
          whatsapp: profile.whatsapp || "",
          city: profile.city || "",
          area: profile.area || "",
          skill: skillsToText(profile.skill),
          experience: profile.experience ?? "",
          price: profile.price ?? "",
          description: profile.description || "",
          photo: profile.photo || "",
        });
        updateUser(profile);
      })
      .catch((error) => {
        if (!cancelled) setFailed(getError(error, "Could not load your profile."));
      });
    return () => {
      cancelled = true;
    };
  }, [toast, updateUser]);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const onFile = (event) => {
    const next = event.target.files?.[0];
    if (!next) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const removePhoto = async () => {
    try {
      const response = await api.delete("/auth/remove-photo");
      const profile = unwrapUser(response.data);
      setForm((current) => ({ ...current, photo: "" }));
      setFile(null);
      setPreview("");
      if (profile) updateUser(profile);
      toast(response.data.message || "Photo removed.", "ok");
    } catch (error) {
      toast(getError(error), "error");
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast("Name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      let photo = form.photo;
      if (file) {
        const body = new FormData();
        body.append("photo", file);
        const uploaded = await api.post("/auth/upload-photo", body);
        photo = uploaded.data.photo;
      }
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        city: form.city.trim(),
        area: form.area.trim(),
        description: form.description.trim(),
      };
      if (photo) payload.photo = photo;
      if (isProvider) {
        payload.skill = textToSkills(form.skill);
        if (form.experience !== "") payload.experience = Number(form.experience);
        if (form.price !== "") payload.price = Number(form.price);
      }
      const response = await api.put("/auth/profile", payload);
      const profile = unwrapUser(response.data);
      setForm((current) => ({
        ...current,
        photo: profile?.photo || photo || "",
        skill: skillsToText(profile?.skill || payload.skill),
      }));
      setFile(null);
      setPreview("");
      if (profile) updateUser(profile);
      toast(response.data.message || "Profile saved.", "ok");
    } catch (error) {
      toast(getError(error), "error");
    } finally {
      setSaving(false);
    }
  };

  if (failed) return <div className="note note-error">{failed}</div>;
  if (!form) return <Loading label="Loading profile" />;

  return (
    <form onSubmit={save} style={{ maxWidth: 760 }}>
      <p className="eyebrow">Account</p>
      <h1 className="section-title" style={{ margin: "8px 0 16px" }}>Your profile</h1>
      <div className="card">
        <div className="photo-picker">
          <Avatar name={form.name} src={preview || form.photo} size="lg" />
          <div>
            <label className="btn btn-line btn-sm">
              Choose photo
              <input hidden type="file" accept="image/*" onChange={onFile} />
            </label>
            {form.photo ? (
              <button className="btn btn-ghost btn-sm" type="button" onClick={removePhoto}>
                Remove photo
              </button>
            ) : null}
            <p className="help">Shown on your account, and on your public profile if you offer a skill.</p>
          </div>
        </div>
        <label className="field">
          <span>Full name</span>
          <input name="name" value={form.name} onChange={update} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Phone</span>
            <input name="phone" value={form.phone} onChange={update} />
          </label>
          <label className="field">
            <span>WhatsApp</span>
            <input name="whatsapp" value={form.whatsapp} onChange={update} />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>City</span>
            <input name="city" value={form.city} onChange={update} />
          </label>
          <label className="field">
            <span>Area</span>
            <input name="area" value={form.area} onChange={update} />
          </label>
        </div>
        {isProvider ? (
          <>
            <label className="field">
              <span>Skills <em className="help">separate with commas</em></span>
              <input name="skill" value={form.skill} onChange={update} />
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
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

export default Profile;
