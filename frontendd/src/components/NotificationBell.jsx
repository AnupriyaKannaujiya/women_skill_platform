import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../lib/api";

const POLL_MS = 60 * 1000;

// "5 min ago", "yesterday", "3 Dec"
function timeAgo(value) {
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function NotificationBell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  const refreshCount = useCallback(() => {
    api
      .get("/notifications/unread-count")
      .then((response) => setUnread(response.data.unread || 0))
      .catch(() => {});
  }, []);

  // Badge: on every page change, every minute, and when the tab comes back into view.
  useEffect(() => {
    refreshCount();
  }, [pathname, refreshCount]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshCount();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCount]);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    try {
      const response = await api.get("/notifications", { params: { limit: 20 } });
      setItems(response.data.notifications || []);
      setUnread(response.data.unread || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const openItem = async (item) => {
    setOpen(false);
    if (!item.isRead) {
      setUnread((value) => Math.max(0, value - 1));
      setItems((list) => list.map((entry) => (entry._id === item._id ? { ...entry, isRead: true } : entry)));
      api.put(`/notifications/${item._id}/read`).catch(() => {});
    }
    if (item.link) navigate(item.link);
  };

  const readAll = async () => {
    setUnread(0);
    setItems((list) => list.map((entry) => ({ ...entry, isRead: true })));
    api.put("/notifications/read-all").catch(() => {});
  };

  const label = unread ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <div className="bell" ref={boxRef}>
      <button
        className="bell-btn"
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        title={label}
        onClick={toggle}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread ? <span className="bell-count">{unread > 9 ? "9+" : unread}</span> : null}
      </button>

      {open ? (
        <div className="bell-panel" role="dialog" aria-label="Notifications">
          <div className="bell-head">
            <strong>Notifications</strong>
            {unread ? (
              <button className="btn btn-ghost btn-sm" type="button" onClick={readAll}>
                Mark all read
              </button>
            ) : null}
          </div>
          {loading ? (
            <p className="muted bell-empty">Loading…</p>
          ) : items.length === 0 ? (
            <p className="muted bell-empty">Nothing yet. Booking updates will show up here.</p>
          ) : (
            <ul className="bell-list">
              {items.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    className={item.isRead ? "bell-item" : "bell-item unread"}
                    onClick={() => openItem(item)}
                  >
                    <span className="bell-title">{item.title}</span>
                    {item.body ? <span className="bell-body">{item.body}</span> : null}
                    <span className="bell-time">{timeAgo(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default NotificationBell;
