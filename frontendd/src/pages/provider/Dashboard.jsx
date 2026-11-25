import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { ConfirmModal, Empty, Loading, Modal, StatusBadge } from "../../components/ui";
import BookingDetails from "../../components/BookingDetails";
import { RescheduleBanner, RescheduleModal, canReschedule } from "../../components/Reschedule";
import { CustomerSafetyLine, RateCustomerModal, ReportCustomerModal } from "../../components/CustomerFeedback";
import { usePageTitle } from "../../lib/usePageTitle";
import { formatDate, formatMoney, getError, isOverdue, phoneHref, skillList, unwrapUser } from "../../lib/format";

const TABS = ["all", "pending", "accepted", "completed", "rejected", "cancelled", "expired"];

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
  const [completing, setCompleting] = useState(null);
  // Customer feedback: which completed bookings she rated, and open dialogs.
  const [rated, setRated] = useState({});
  const [ratingFor, setRating] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [moving, setMoving] = useState(null);
  const [overtime, setOvertime] = useState("0");
  // Read the clock once per visit; the backend re-checks the date on completion anyway.
  const [now] = useState(() => Date.now());

  const load = () => {
    return Promise.allSettled([
      api.get("/auth/profile"),
      api.get("/bookings/provider/dashboard"),
      api.get("/bookings/provider"),
      api.get("/customer-feedback/ratings/mine"),
    ]).then(([profile, stats, list, ratings]) => {
      if (profile.status === "fulfilled") setUser(unwrapUser(profile.value.data));
      if (stats.status === "fulfilled") setDashboard(stats.value.data.dashboard);
      if (list.status === "fulfilled") setBookings(list.value.data.bookings || []);
      if (ratings.status === "fulfilled") {
        setRated(Object.fromEntries((ratings.value.data.ratings || []).map((r) => [String(r.booking), r.rating])));
      }
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

  const updateStatus = async (id, status, extra = {}) => {
    setBusy(id + status);
    try {
      await api.put(`/bookings/${id}/status`, { status, ...extra });
      toast(`Booking ${status}.`, "ok");
      await load();
    } catch (err) {
      toast(getError(err), "error");
    } finally {
      setBusy("");
    }
  };

  const checkInOut = async (id, action) => {
    setBusy(id + action);
    try {
      const response = await api.put(`/bookings/${id}/${action}`);
      toast(response.data.message, "ok");
      await load();
    } catch (err) {
      toast(getError(err), "error");
    } finally {
      setBusy("");
    }
  };

  if (loading && !user) return <Loading label="Loading requests" />;

  const overdue = bookings.filter((item) => isOverdue(item, now));
  // "overdue" is a view, not a stored status: accepted work whose date has passed.
  const matches = (tab) => (item) =>
    tab === "all" ? true : tab === "overdue" ? isOverdue(item, now) : item.status === tab;
  const countFor = (tab) => bookings.filter(matches(tab)).length;
  const tabs = overdue.length ? ["overdue", ...TABS] : TABS;
  const shown = bookings.filter(matches(filter));

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

      {user && !user.isVerified ? (
        <section className="card split" style={{ marginTop: 12 }}>
          <div>
            <strong>
              {user.verification?.status === "pending"
                ? "Your ID is being checked"
                : user.verification?.status === "rejected"
                  ? "Your ID check needs a new photo"
                  : "Get the ✓ Verified badge"}
            </strong>
            <p className="muted">
              {user.verification?.status === "pending"
                ? "You will get an email when the team has looked at it."
                : "Verified profiles earn more trust and show up in the “Verified only” search."}
            </p>
          </div>
          {user.verification?.status !== "pending" ? (
            <Link className="btn btn-sage btn-sm" to="/provider/verification">
              {user.verification?.status === "rejected" ? "Upload again" : "Verify my ID"}
            </Link>
          ) : null}
        </section>
      ) : null}

      <h2 style={{ margin: "22px 0 12px" }}>Requests</h2>
      {overdue.length ? (
        <div className="note note-warn" role="status" style={{ marginBottom: 14 }}>
          <strong>
            {overdue.length} booking{overdue.length === 1 ? "" : "s"} need{overdue.length === 1 ? "s" : ""} an update.
          </strong>{" "}
          The booked time has passed. Mark the work completed so the customer can review you, or cancel it if it did
          not happen.{" "}
          {filter !== "overdue" ? (
            <button className="btn btn-line btn-sm" type="button" onClick={() => setFilter("overdue")}>
              Show {overdue.length === 1 ? "it" : "them"}
            </button>
          ) : null}
        </div>
      ) : null}
      {bookings.length ? (
        <div className="chip-row" role="tablist" aria-label="Filter requests" style={{ marginBottom: 14 }}>
          {tabs.map((tab) => (
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
                  <h3>
                    {booking.customer?.name || "Customer"}{" "}
                    {booking.customer?.isVerified ? (
                      <span className="verified-badge">✓ Verified customer</span>
                    ) : (
                      <span className="chip" title="This customer has not verified their ID">ID not verified</span>
                    )}
                  </h3>
                  {tel ? (
                    <a className="muted" href={tel}>{booking.customer.phone}</a>
                  ) : (
                    <p className="muted">No phone shared</p>
                  )}
                  <CustomerSafetyLine safety={booking.customer?.safety} />
                </div>
                <StatusBadge status={isOverdue(booking, now) ? "overdue" : booking.status} />
              </div>
              <BookingDetails booking={booking} viewer="provider" />
              {booking.status === "pending" && !booking.customer?.isVerified ? (
                <p className="help" style={{ marginBottom: 8 }}>
                  ⚠️ This customer has not verified their ID yet. You can still accept, or turn on "verified customers
                  only" in Safety.
                </p>
              ) : null}
              {booking.status === "accepted" && booking.serviceMode === "at_customer" ? (
                <div className="cluster" style={{ marginBottom: 8 }}>
                  {!booking.checkInAt ? (
                    <button className="btn btn-line btn-sm" type="button" disabled={Boolean(busy)} onClick={() => checkInOut(booking._id, "check-in")}>
                      📍 I've arrived
                    </button>
                  ) : !booking.checkOutAt ? (
                    <button className="btn btn-sage btn-sm" type="button" disabled={Boolean(busy)} onClick={() => checkInOut(booking._id, "check-out")}>
                      ✅ I've left safely
                    </button>
                  ) : (
                    <span className="help">✅ Checked out safely</span>
                  )}
                </div>
              ) : null}
              <RescheduleBanner booking={booking} viewer="provider" onChanged={load} />
              {booking.status === "pending" && booking.reschedule?.status !== "pending" ? (
                <div className="cluster">
                  <button className="btn btn-sage btn-sm" type="button" disabled={Boolean(busy)} onClick={() => updateStatus(booking._id, "accepted")}>
                    {busy === booking._id + "accepted" ? "Accepting…" : "Accept"}
                  </button>
                  {canReschedule(booking, now) ? (
                    <button className="btn btn-line btn-sm" type="button" disabled={Boolean(busy)} onClick={() => setMoving(booking)}>
                      🕑 Suggest another time
                    </button>
                  ) : null}
                  <button className="btn btn-danger btn-sm" type="button" disabled={Boolean(busy)} onClick={() => setConfirm({ booking, status: "rejected" })}>
                    Reject
                  </button>
                </div>
              ) : null}
              {booking.status === "accepted" ? (
                <div className="cluster">
                  {due ? (
                    <button className="btn btn-primary btn-sm" type="button" disabled={Boolean(busy)} onClick={() => { setOvertime("0"); setCompleting(booking); }}>
                      Mark completed
                    </button>
                  ) : (
                    <span className="help">You can mark this completed after {formatDate(booking.bookingDate)}.</span>
                  )}
                  {canReschedule(booking, now) ? (
                    <button className="btn btn-line btn-sm" type="button" disabled={Boolean(busy)} onClick={() => setMoving(booking)}>
                      🕑 Change time
                    </button>
                  ) : null}
                  <button className="btn btn-line btn-sm" type="button" disabled={Boolean(busy)} onClick={() => setConfirm({ booking, status: "cancelled" })}>
                    {due ? "It didn't happen" : "Cancel booking"}
                  </button>
                </div>
              ) : null}
              {booking.status === "cancelled" ? (
                <p className="help">
                  {booking.cancelledBy === "provider" ? "You cancelled this booking" : "The customer cancelled this request"}
                  {booking.cancelledAt ? ` on ${formatDate(booking.cancelledAt)}` : ""}.
                </p>
              ) : null}
              {booking.status === "expired" ? (
                <p className="help">This request expired because it was not answered before the booked time.</p>
              ) : null}
              {booking.customer?._id ? (
                <div className="feedback-row">
                  {booking.status === "completed" ? (
                    rated[booking._id] ? (
                      <span className="help">You rated this customer ★ {rated[booking._id]}</span>
                    ) : (
                      <button className="btn btn-line btn-sm" type="button" onClick={() => setRating(booking)}>
                        ⭐ Rate customer
                      </button>
                    )
                  ) : null}
                  <button className="link-btn" type="button" onClick={() => setReporting(booking)}>
                    Report customer
                  </button>
                </div>
              ) : null}
            </article>
          );
        })
      )}

      {moving ? (
        <RescheduleModal
          booking={moving}
          providerId={user?._id}
          viewer="provider"
          onClose={() => setMoving(null)}
          onDone={() => {
            setMoving(null);
            load();
          }}
        />
      ) : null}

      {ratingFor ? (
        <RateCustomerModal
          booking={ratingFor}
          onClose={() => setRating(null)}
          onDone={(saved) => {
            setRated((map) => ({ ...map, [ratingFor._id]: saved.rating }));
            setRating(null);
          }}
        />
      ) : null}
      {reporting ? (
        <ReportCustomerModal booking={reporting} onClose={() => setReporting(null)} onDone={() => setReporting(null)} />
      ) : null}

      {completing ? (
        <Modal title="Mark this work completed?" onClose={() => setCompleting(null)}>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await updateStatus(completing._id, "completed", { overtimeHours: Number(overtime) || 0 });
              setCompleting(null);
            }}
          >
            <p className="muted" style={{ marginBottom: 12 }}>
              {completing.customer?.name || "The customer"} will be able to leave a review. This cannot be changed later.
            </p>
            <label className="field">
              <span>Extra time beyond the {completing.package?.hours ? `${completing.package.hours}-hour package` : "package"}</span>
              <select value={overtime} onChange={(e) => setOvertime(e.target.value)}>
                {[0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6].map((h) => (
                  <option key={h} value={h}>{h === 0 ? "No overtime" : `${h} hour${h === 1 ? "" : "s"}`}</option>
                ))}
              </select>
            </label>
            <p className="price-line">
              Final amount:{" "}
              <strong>
                {formatMoney(
                  (completing.charges?.service || 0) +
                    (completing.charges?.travel || 0) +
                    Math.round((Number(overtime) || 0) * (user?.overtimeRate || 0)),
                )}
              </strong>
              {Number(overtime) ? (
                <span className="help"> (includes {formatMoney(Math.round(Number(overtime) * (user?.overtimeRate || 0)))} overtime at {formatMoney(user?.overtimeRate || 0)}/h)</span>
              ) : null}
            </p>
            <div className="cluster" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn btn-line" type="button" onClick={() => setCompleting(null)}>Not yet</button>
              <button className="btn btn-primary" type="submit" disabled={Boolean(busy)}>Mark completed</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmModal
          title={
            confirm.status === "completed"
              ? "Mark this work completed?"
              : confirm.status === "cancelled"
                ? "Cancel this booking?"
                : "Turn down this booking?"
          }
          text={
            confirm.status === "completed"
              ? `${confirm.booking.customer?.name || "The customer"} will then be able to leave a review. This cannot be changed later.`
              : confirm.status === "cancelled"
                ? `${confirm.booking.customer?.name || "The customer"} will see that you cancelled it. This cannot be undone.`
                : `${confirm.booking.customer?.name || "The customer"} will see it as rejected. This cannot be undone.`
          }
          confirmLabel={
            confirm.status === "completed" ? "Mark completed" : confirm.status === "cancelled" ? "Yes, cancel it" : "Reject booking"
          }
          cancelLabel={confirm.status === "completed" ? "Not yet" : "Keep booking"}
          danger={confirm.status !== "completed"}
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
