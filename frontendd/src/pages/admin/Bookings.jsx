import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { Loading, Modal, StatusBadge } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { formatDate, getError, isOverdue } from "../../lib/format";

function AdminBookings() {
  usePageTitle("Bookings");
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  // Links such as /admin/bookings?status=overdue open with that filter already set.
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(() => searchParams.get("status") || "all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/bookings")
      .then((response) => {
        if (!cancelled) setBookings(response.data.bookings || []);
      })
      .catch((err) => {
        if (!cancelled) setError(getError(err, "Could not load bookings."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return bookings.filter((booking) => {
      const query = search.trim().toLowerCase();
      const names = `${booking.customer?.name || ""} ${booking.provider?.name || ""}`.toLowerCase();
      const matchesQuery = !query || names.includes(query) || booking.service?.toLowerCase().includes(query);
      const matchesStatus =
        status === "all" || (status === "overdue" ? isOverdue(booking) : booking.status === status);
      return matchesQuery && matchesStatus;
    });
  }, [bookings, search, status]);

  const perPage = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading) return <Loading label="Loading bookings" />;

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="section-title" style={{ margin: "8px 0 12px" }}>Bookings</h1>
      {error ? <div className="note note-error">{error}</div> : null}
      <div className="toolbar">
        <input placeholder="Search people or service" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
          <option value="overdue">Overdue (past date, not completed)</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Provider</th>
              <th>Service</th>
              <th>When</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan="6">No bookings match.</td></tr>
            ) : (
              visible.map((booking) => (
                <tr key={booking._id}>
                  <td>{booking.customer?.name}</td>
                  <td>{booking.provider?.name}</td>
                  <td>{booking.service}</td>
                  <td>{formatDate(booking.bookingDate)}</td>
                  <td><StatusBadge status={isOverdue(booking) ? "overdue" : booking.status} /></td>
                  <td><button className="btn btn-line btn-sm" type="button" onClick={() => setSelected(booking)}>Details</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <div className="pager">
          <button className="btn btn-line btn-sm" type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button className="btn btn-line btn-sm" type="button" disabled={page === pages} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      ) : null}
      {selected ? (
        <Modal title="Booking" onClose={() => setSelected(null)}>
          <dl className="meta-grid">
            <div><dt>Customer</dt><dd>{selected.customer?.name}<br />{selected.customer?.phone}</dd></div>
            <div><dt>Provider</dt><dd>{selected.provider?.name}<br />{selected.provider?.phone}</dd></div>
            <div><dt>Service</dt><dd>{selected.service}</dd></div>
            <div><dt>When</dt><dd>{formatDate(selected.bookingDate)}</dd></div>
            <div><dt>Address</dt><dd>{selected.address}</dd></div>
            <div><dt>Payment</dt><dd>{selected.paymentStatus || "pending"}</dd></div>
          </dl>
          <p style={{ marginTop: 10 }}>{selected.message || "No message."}</p>
        </Modal>
      ) : null}
    </div>
  );
}

export default AdminBookings;
