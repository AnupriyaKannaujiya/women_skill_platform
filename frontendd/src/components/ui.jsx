import { useEffect, useState } from "react";
import { initials } from "../lib/format";

export function Avatar({ name, src, size = "md" }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <img
        className={`avatar avatar-${size}`}
        src={src}
        alt=""
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Stars({ value = 0, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || Number(value) || 0;

  if (!onChange) {
    return (
      <span className="stars" aria-label={`${Number(value || 0).toFixed(1)} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= Math.round(shown) ? "on" : ""}>
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="stars" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={star <= shown ? "on" : ""}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </span>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status || "pending"}`}>{status || "pending"}</span>;
}

export function Loading({ label = "Loading" }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}

// In-page confirmation for actions that cannot be undone (reject, delete, complete).
export function ConfirmModal({
  title,
  text,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      {text ? <p className="muted" style={{ marginBottom: 16 }}>{text}</p> : null}
      <div className="cluster" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-line" type="button" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          className={danger ? "btn btn-danger" : "btn btn-primary"}
          type="button"
          onClick={onConfirm}
          disabled={busy}
          autoFocus
        >
          {busy ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Modal({ title, children, onClose, wide = false }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className={wide ? "modal lightbox" : "modal"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

