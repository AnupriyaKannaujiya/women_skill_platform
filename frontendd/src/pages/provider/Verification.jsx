import { useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Loading } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { formatDate, getError } from "../../lib/format";

const ID_TYPES = [
  ["aadhaar", "Aadhaar card"],
  ["pan", "PAN card"],
  ["voter", "Voter ID"],
  ["driving", "Driving licence"],
  ["passport", "Passport"],
  ["other", "Other government ID"],
];
const MAX_SIZE = 5 * 1024 * 1024;

const idLabel = (value) => ID_TYPES.find(([key]) => key === value)?.[1] || "ID";

function Verification() {
  usePageTitle("Verification");
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const isCustomer = user?.role === "customer";
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idType, setIdType] = useState("aadhaar");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [resubmit, setResubmit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/verification/me")
      .then((response) => {
        if (!cancelled) setInfo(response.data.verification);
      })
      .catch((err) => {
        if (!cancelled) setError(getError(err, "Could not load your verification status."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The preview URL is made when a photo is picked and freed when it is replaced,
  // cleared, or the page closes (the ref lets the unmount cleanup see the latest one).
  const previewRef = useRef("");
  const showPreview = (next) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : "";
    setPreview(previewRef.current);
  };
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const choose = (event) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    setError("");
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setError("Please choose a photo (JPG or PNG) of your ID.");
      return;
    }
    if (picked.size > MAX_SIZE) {
      setError("That photo is over 5 MB. Please choose a smaller one.");
      return;
    }
    setFile(picked);
    showPreview(picked);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Add a clear photo of your ID.");
      return;
    }
    if (!consent) {
      setError("Please tick the box to let the team check your ID.");
      return;
    }
    const body = new FormData();
    body.append("idType", idType);
    body.append("consent", "true");
    body.append("document", file);
    setSending(true);
    try {
      const response = await api.post("/verification", body);
      setInfo(response.data.verification);
      setFile(null);
      showPreview(null);
      setConsent(false);
      setResubmit(false);
      toast(response.data.message || "Sent for review.", "ok");
      if (user) updateUser({ ...user, verification: { ...(user.verification || {}), status: "pending" } });
    } catch (err) {
      setError(getError(err, "Upload failed. Please try again."));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Loading label="Loading verification" />;

  const status = info?.status || "unverified";
  const showForm = status === "unverified" || status === "rejected" || resubmit;

  return (
    <div style={{ maxWidth: 720 }}>
      <p className="eyebrow">{isCustomer ? "Customer" : "Provider"}</p>
      <h1 className="section-title" style={{ margin: "8px 0 8px" }}>Get verified</h1>
      {isCustomer ? (
        <p className="muted" style={{ marginBottom: 16 }}>
          Women on Women Skill often work inside customers' homes. A checked ID tells them you are a genuine customer:
          your requests show a <span className="verified-badge" style={{ margin: "0 4px" }}>✓ Verified customer</span>
          badge, and you can book providers who only accept verified customers.
        </p>
      ) : (
        <p className="muted" style={{ marginBottom: 16 }}>
          Customers trust a profile more when the Women Skill team has checked her ID. Verified profiles show a
          <span className="verified-badge" style={{ margin: "0 6px" }}>✓ Verified</span>
          badge and appear in the "Verified only" search.
        </p>
      )}

      {status === "verified" ? (
        <section className="card" role="status">
          <h2>✓ You are verified</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Verified on {formatDate(info.reviewedAt)}.{" "}
            {isCustomer ? "Providers now see you as a verified customer." : "The badge now shows on your profile and in search."}
          </p>
        </section>
      ) : null}

      {status === "pending" && !resubmit ? (
        <section className="card" role="status">
          <span className="badge badge-pending">In review</span>
          <h2 style={{ marginTop: 10 }}>Your {idLabel(info.idType)} is being checked</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Sent on {formatDate(info.submittedAt)}. This usually takes a day or two. You will get an email when it is
            done.
          </p>
          <button className="btn btn-line btn-sm" type="button" style={{ marginTop: 12 }} onClick={() => setResubmit(true)}>
            Upload a different photo
          </button>
        </section>
      ) : null}

      {status === "rejected" ? (
        <div className="note note-error" role="alert" style={{ marginBottom: 16 }}>
          <strong>We could not verify your last upload.</strong> {info.note ? `Reason: ${info.note}` : ""} Please upload
          a new, clear photo.
        </div>
      ) : null}

      {showForm ? (
        <form className="card" onSubmit={submit} noValidate>
          <label className="field">
            <span>Which ID is this?</span>
            <select value={idType} onChange={(event) => setIdType(event.target.value)}>
              {ID_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="dropzone" style={{ position: "relative" }}>
            <input type="file" accept="image/*" onChange={choose} />
            {preview ? (
              <img src={preview} alt="Selected ID" style={{ maxHeight: 220, borderRadius: 12, objectFit: "contain" }} />
            ) : null}
            <strong>{file ? "Choose a different photo" : "Click to choose a photo of your ID"}</strong>
            <span className="help">JPG or PNG, up to 5 MB. All four corners visible, name and photo readable.</span>
          </label>

          <div className="note" style={{ margin: "14px 0" }}>
            <strong>Your privacy:</strong> only the admin team can open this photo, through a link that expires in
            10 minutes. It is deleted as soon as the check is done. We never show it to customers. For Aadhaar, you
            may cover the first 8 digits.
          </div>

          <label className="check-row" style={{ justifyContent: "flex-start", gap: 10, margin: "0 0 14px" }}>
            <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setError(""); }} />
            <span>I agree that the Women Skill team may look at this ID to verify my profile.</span>
          </label>

          {error ? <p className="error-text" role="alert" style={{ marginBottom: 12 }}>{error}</p> : null}

          <div className="cluster">
            <button className="btn btn-primary" type="submit" disabled={sending}>
              {sending ? "Uploading…" : "Send for verification"}
            </button>
            {resubmit ? (
              <button className="btn btn-line" type="button" onClick={() => { setResubmit(false); setFile(null); showPreview(null); setError(""); }}>
                Keep the earlier upload
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}

export default Verification;
