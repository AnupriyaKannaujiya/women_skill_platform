import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { Avatar, ConfirmModal, Empty, Loading, StatusBadge } from "../../components/ui";
import BookingDetails from "../../components/BookingDetails";
import { useToast } from "../../context/ToastContext";
import { usePageTitle } from "../../lib/usePageTitle";
import { formatDate, getError, isOverdue, phoneHref, whatsappHref } from "../../lib/format";

const TABS = ["all", "pending", "accepted", "completed", "rejected", "cancelled", "expired"];

function CustomerDashboard() {
  usePageTitle("My bookings");
  const [filter, setFilter] = useState("all");
  const [dashboard, setDashboard] = useState(null);
  // How providers rated this customer (average only; who rated is never shown).
  const [myRating, setMyRating] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  // Bumped after an action so the effect below reloads the list.
  const [version, setVersion] = useState(0);
  const [now] = useState(() => Date.now());
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([api.get("/bookings/customer/dashboard"), api.get("/bookings/my"), api.get("/auth/profile")])
      .then(([stats, list, profile]) => {
        if (cancelled) return;
        if (stats.status === "fulfilled") setDashboard(stats.value.data.dashboard);
        if (profile.status === "fulfilled") {
          const me = profile.value.data?.user || profile.value.data;
          setMyRating({ rating: me?.customerRating || 0, count: me?.customerRatingCount || 0 });
        }
        if (list.status === "fulfilled") setBookings(list.value.data.bookings || []);
        if (stats.status === "rejected" && list.status === "rejected") {
          setError(getError(list.reason, "Could not load your bookings."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const cancelBooking = async () => {
    setBusy(true);
    try {
      const response = await api.put(`/bookings/${confirm._id}/cancel`);
      toast(response.data.message || "Booking cancelled.", "ok");
      setConfirm(null);
      setVersion((value) => value + 1);
    } catch (err) {
      toast(getError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Loading your bookings" />;

  const canCancel = (booking) =>
    ["pending", "accepted"].includes(booking.status) && new Date(booking.bookingDate).getTime() > now;

  const shown = filter === "all" ? bookings : bookings.filter((item) => item.status === filter);

  const cards = [
    ["Total", dashboard?.totalBookings ?? bookings.length],
    ["Pending", dashboard?.pendingBookings ?? bookings.filter((item) => item.status === "pending").length],
    ["Accepted", dashboard?.acceptedBookings ?? bookings.filter((item) => item.status === "accepted").length],
    ["Completed", dashboard?.completedBookings ?? bookings.filter((item) => item.status === "completed").length],
  ];

  return (
    <div>
      <p className="eyebrow">Customer</p>
      <h1 className="section-title" style={{ margin: "8px 0 16px" }}>My bookings</h1>
      {myRating?.count ? (
        <p className="note" style={{ marginBottom: 14 }}>
          Your rating from providers: <strong>★ {Number(myRating.rating).toFixed(1)}</strong> ({myRating.count} booking
          {myRating.count === 1 ? "" : "s"}). Being on time, respectful and paying promptly keeps it high — providers see it
          when you book.
        </p>
      ) : null}
      {error ? <div className="note note-error">{error}</div> : null}
      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <article className="stat" key={label}>
            <span className="muted">{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div style={{ marginTop: 22 }}>
        {bookings.length ? (
          <div className="chip-row" role="tablist" aria-label="Filter bookings" style={{ marginBottom: 14 }}>
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
                <span className="count">
                  {tab === "all" ? bookings.length : bookings.filter((item) => item.status === tab).length}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {bookings.length === 0 ? (
          <Empty
            title="No requests yet"
            text="When you book someone, the status will show here."
            action={<Link className="btn btn-primary" to="/providers">Find a woman</Link>}
          />
        ) : shown.length === 0 ? (
          <Empty title={`No ${filter} bookings`} text="Pick another tab to see the rest." />
        ) : (
          shown.map((booking) => {
            const provider = booking.provider || {};
            const canContact = booking.status === "accepted" || booking.status === "completed";
            return (
              <article className="booking" key={booking._id}>
                <div className="booking-head">
                  <div className="person">
                    <Avatar name={provider.name} src={provider.photo} />
                    <div>
                      <h3>
                        {provider._id ? (
                          <Link to={`/providers/${provider._id}`}>{provider.name || "Provider"}</Link>
                        ) : (
                          provider.name || "Provider"
                        )}
                      </h3>
                      <p className="muted">{provider.city}</p>
                    </div>
                  </div>
                  <StatusBadge status={isOverdue(booking, now) ? "overdue" : booking.status} />
                </div>
                <BookingDetails booking={booking} viewer="customer" providerAddress={provider.providerAddress} />
                {canContact ? (
                  <div className="cluster">
                    {phoneHref(provider.phone) ? <a className="btn btn-line btn-sm" href={phoneHref(provider.phone)}>Call</a> : null}
                    {whatsappHref(provider.whatsapp) ? (
                      <a className="btn btn-sage btn-sm" href={whatsappHref(provider.whatsapp)} target="_blank" rel="noreferrer">WhatsApp</a>
                    ) : null}
                    {booking.status === "completed" ? (
                      <Link className="btn btn-primary btn-sm" to={`/review/${provider._id}`}>Write a review</Link>
                    ) : null}
                    {isOverdue(booking, now) ? (
                      <p className="help" style={{ flexBasis: "100%" }}>
                        The booked time has passed. Once she marks it completed you can write a review. Something went
                        wrong? <Link to="/contact">Tell us</Link>.
                      </p>
                    ) : null}
                  </div>
                ) : booking.status === "rejected" ? (
                  <div className="cluster">
                    <p className="muted">She could not take this booking.</p>
                    <Link className="btn btn-line btn-sm" to="/providers">Find someone else</Link>
                  </div>
                ) : booking.status === "cancelled" ? (
                  booking.cancelledBy === "provider" ? (
                    <div className="cluster">
                      <p className="muted">She cancelled this booking{booking.cancelledAt ? ` on ${formatDate(booking.cancelledAt)}` : ""}.</p>
                      <Link className="btn btn-line btn-sm" to="/providers">Find someone else</Link>
                    </div>
                  ) : (
                    <p className="muted">You cancelled this request{booking.cancelledAt ? ` on ${formatDate(booking.cancelledAt)}` : ""}.</p>
                  )
                ) : booking.status === "expired" ? (
                  <div className="cluster">
                    <p className="muted">She did not reply before the booked time, so this request closed.</p>
                    <Link className="btn btn-line btn-sm" to="/providers">Find someone else</Link>
                  </div>
                ) : (
                  <p className="muted">Phone and WhatsApp open after she accepts.</p>
                )}
                {canCancel(booking) ? (
                  <div className="cluster" style={{ marginTop: 10 }}>
                    <button className="btn btn-line btn-sm" type="button" onClick={() => setConfirm(booking)}>
                      Cancel booking
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {confirm ? (
        <ConfirmModal
          title="Cancel this booking?"
          text={`${confirm.provider?.name || "The provider"} will see that you cancelled the ${confirm.service} request for ${formatDate(confirm.bookingDate)}. This cannot be undone.`}
          confirmLabel="Yes, cancel it"
          cancelLabel="Keep booking"
          danger
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={cancelBooking}
        />
      ) : null}
    </div>
  );
}

export default CustomerDashboard;
