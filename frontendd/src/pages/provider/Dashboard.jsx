import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { ConfirmModal, Empty, Loading, StatusBadge } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { formatDate, getError, phoneHref, skillList, unwrapUser } from "../../lib/format";

const TABS = ["all", "pending", "accepted", "completed", "rejected"];

function completion(user) {
  if (!user) return 0;
  const checks = [
    user.name,
    user.phone,
    user.city,
    user.area,
    skillList(user.skill).length,
    user.experience,
    user.price,
    user.description,
    user.photo,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

function ProviderDashboard() {
  usePageTitle("Requests");
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);
  // Read the clock once per visit; the backend re-checks the date on completion anyway.
  const [now] = useState(() => Date.now());

  const load = () => {
    return Promise.allSettled([
      api.get("/auth/profile"),
      api.get("/bookings/provider/dashboard"),
      api.get("/bookings/provider"),
    ]).then(([profile, stats, list]) => {
      if (profile.status === "fulfilled") setUser(unwrapUser(profile.value.data));
      if (stats.status === "fulfilled") setDashboard(stats.value.data.dashboard);
      if (list.status === "fulfilled") setBookings(list.value.data.bookings || []);
      if (list.status === "rejected") setError(getError(list.reason, "Could not load requests."));
      setLoading(false);
    });
  };

  useEffect(() => {
    let cancelled = false;
    load().finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStatus = async (id, status) => {
    setBusy(id + status);
    try {
      await api.put(`/bookings/${id}/status`, { status });
      toast(`Booking ${status}.`, "ok");
      await load();
    } catch (err) {
      toast(getError(err), "error");
    } finally {
      setBusy("");
    }
  };

  if (loading && !user) return <Loading label="Loading requests" />;

  const countFor = (tab) =>
    tab === "all" ? bookings.length : bookings.filter((item) => item.status === tab).length;
  const shown = filter === "all" ? bookings : bookings.filter((item) => item.status === filter);

  const percent = completion(user);
  const cards = [
    ["Requests", dashboard?.totalBookings ?? bookings.length],
    ["Pending", dashboard?.pendingBookings ?? bookings.filter((item) => item.status === "pending").length],
    ["Accepted", dashboard?.acceptedBookings ?? bookings.filter((item) => item.status === "accepted").length],
    ["Completed", dashboard?.completedBookings ?? bookings.filter((item) => item.status === "completed").length],
  ];

  return (
    <div>
      <p className="eyebrow">Provider</p>
      <h1 className="section-title" style={{ margin: "8px 0 8px" }}>
        Hello{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="muted">Accept the work you want. Mark it complete when you are done.</p>
      {error ? <div className="note note-error" style={{ marginTop: 12 }}>{error}</div> : null}

      <div className="stat-grid" style={{ marginTop: 18 }}>
        {cards.map(([label, value]) => (
          <article className="stat" key={label}>
            <span className="muted">{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="split">
          <div>
            <strong>Profile is {percent}% filled</strong>
            <p className="muted">City, skill, price and a photo help you show up in search.</p>
          </div>
          <div className="cluster">
            <Link className="btn btn-primary btn-sm" to="/account/profile">Edit profile</Link>
            <Link className="btn btn-line btn-sm" to="/provider/portfolio">Portfolio</Link>
          </div>
        </div>
        <div className="progress" style={{ marginTop: 12 }}>
          <span style={{ width: `${percent}%` }} />
        </div>
      </section>

      <h2 style={{ margin: "22px 0 12px" }}>Requests</h2>
      {bookings.length ? (
        <div className="chip-row" role="tablist" aria-label="Filter requests" style={{ marginBottom: 14 }}>
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
              <span className="count">{countFor(tab)}</span>
            </button>
          ))}
        </div>
      ) : null}
      {bookings.length === 0 ? (
        <Empty title="No requests yet" text="Complete your profile so customers can find you." />
      ) : shown.length === 0 ? (
        <Empty title={`No ${filter} requests`} text="Pick another tab to see the rest." />
      ) : (
        shown.map((booking) => {
          const due = new Date(booking.bookingDate).getTime() <= now;
          const tel = phoneHref(booking.customer?.phone);
          return (
            <article className="booking" key={booking._id}>
              <div className="booking-head">
                <div>
                  <h3>{booking.customer?.name || "Customer"}</h3>
                  {tel ? (
                    <a className="muted" href={tel}>{booking.customer.phone}</a>
                  ) : (
                    <p className="muted">No phone shared</p>
                  )}
                </div>
                <StatusBadge status={booking.status} />
              </div>
              <dl className="meta-grid">
                <div><dt>Service</dt><dd>{booking.service}</dd></div>
                <div><dt>When</dt><dd>{formatDate(booking.bookingDate)}</dd></div>
                <div><dt>Address</dt><dd>{booking.address}</dd></div>
                <div><dt>Note</dt><dd>{booking.message || "—"}</dd></div>
              </dl>
              {booking.status === "pending" ? (
                <div className="cluster">
                  <button className="btn btn-sage btn-sm" type="button" disabled={Boolean(busy)} onClick={() => updateStatus(booking._id, "accepted")}>
                    {busy === booking._id + "accepted" ? "Accepting…" : "Accept"}
                  </button>
                  <button className="btn btn-danger btn-sm" type="button" disabled={Boolean(busy)} onClick={() => setConfirm({ booking, status: "rejected" })}>
                    Reject
                  </button>
                </div>
              ) : null}
              {booking.status === "accepted" ? (
                <div className="cluster">
                  {due ? (
                    <button className="btn btn-primary btn-sm" type="button" disabled={Boolean(busy)} onClick={() => setConfirm({ booking, status: "completed" })}>
                      Mark completed
                    </button>
                  ) : (
                    <span className="help">You can mark this completed after {formatDate(booking.bookingDate)}.</span>
                  )}
                  <button className="btn btn-line btn-sm" type="button" disabled={Boolean(busy)} onClick={() => setConfirm({ booking, status: "rejected" })}>
                    Cancel booking
                  </button>
                </div>
              ) : null}
            </article>
          );
        })
      )}

      {confirm ? (
        <ConfirmModal
          title={confirm.status === "completed" ? "Mark this work completed?" : "Turn down this booking?"}
          text={
            confirm.status === "completed"
              ? `${confirm.booking.customer?.name || "The customer"} will then be able to leave a review. This cannot be changed later.`
              : `${confirm.booking.customer?.name || "The customer"} will see it as rejected. This cannot be undone.`
          }
          confirmLabel={confirm.status === "completed" ? "Mark completed" : "Reject booking"}
          danger={confirm.status === "rejected"}
          busy={Boolean(busy)}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await updateStatus(confirm.booking._id, confirm.status);
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}

export default ProviderDashboard;
