import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { ConfirmModal, Empty, Loading } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { formatDate, getError } from "../../lib/format";

const TABS = ["unread", "all"];

function AdminMessages() {
  usePageTitle("Messages");
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState("unread");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/messages")
      .then((response) => {
        if (cancelled) return;
        setMessages(response.data.messages || []);
        setUnread(response.data.unread || 0);
      })
      .catch((err) => {
        if (!cancelled) setError(getError(err, "Could not load messages."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const toggleRead = async (message) => {
    setBusy(message._id);
    try {
      await api.put(`/admin/messages/${message._id}/read`, { isRead: !message.isRead });
      setVersion((value) => value + 1);
    } catch (err) {
      toast(getError(err), "error");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    setBusy(pending._id);
    try {
      const response = await api.delete(`/admin/messages/${pending._id}`);
      toast(response.data.message || "Message deleted.", "ok");
      setPending(null);
      setVersion((value) => value + 1);
    } catch (err) {
      toast(getError(err), "error");
    } finally {
      setBusy("");
    }
  };

  if (loading) return <Loading label="Loading messages" />;

  const shown = filter === "unread" ? messages.filter((item) => !item.isRead) : messages;

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="section-title" style={{ margin: "8px 0 6px" }}>Messages</h1>
      <p className="muted" style={{ marginBottom: 14 }}>Notes sent from the Contact page.</p>
      {error ? <div className="note note-error">{error}</div> : null}

      <div className="chip-row" role="tablist" aria-label="Filter messages" style={{ marginBottom: 14 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={filter === tab}
            className={filter === tab ? "chip active" : "chip"}
            onClick={() => setFilter(tab)}
          >
            {tab}
            <span className="count">{tab === "unread" ? unread : messages.length}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty
          title={filter === "unread" ? "Inbox zero" : "No messages yet"}
          text={filter === "unread" ? "Every message has been read." : "Messages from the Contact page will show here."}
        />
      ) : (
        shown.map((message) => (
          <article className="booking" key={message._id} style={message.isRead ? { opacity: 0.75 } : undefined}>
            <div className="booking-head">
              <div>
                <h3>
                  {message.name}
                  {message.user ? <span className="chip" style={{ marginLeft: 8 }}>{message.user.role}</span> : null}
                </h3>
                {message.email ? (
                  <a className="muted" href={`mailto:${message.email}`}>{message.email}</a>
                ) : (
                  <p className="muted">No email given</p>
                )}
              </div>
              <span className={message.isRead ? "badge badge-cancelled" : "badge badge-pending"}>
                {message.isRead ? "read" : "new"}
              </span>
            </div>
            <p style={{ margin: "12px 0", whiteSpace: "pre-wrap" }}>{message.message}</p>
            <div className="split">
              <span className="help">{formatDate(message.createdAt)}</span>
              <div className="cluster">
                {message.email ? (
                  <a className="btn btn-line btn-sm" href={`mailto:${message.email}?subject=${encodeURIComponent("Re: your message to Women Skill")}`}>
                    Reply
                  </a>
                ) : null}
                <button className="btn btn-line btn-sm" type="button" disabled={busy === message._id} onClick={() => toggleRead(message)}>
                  {message.isRead ? "Mark unread" : "Mark read"}
                </button>
                <button className="btn btn-danger btn-sm" type="button" disabled={busy === message._id} onClick={() => setPending(message)}>
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))
      )}

      {pending ? (
        <ConfirmModal
          title="Delete this message?"
          text={`The message from ${pending.name} will be removed for good.`}
          confirmLabel="Delete message"
          danger
          busy={busy === pending._id}
          onCancel={() => setPending(null)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}

export default AdminMessages;
