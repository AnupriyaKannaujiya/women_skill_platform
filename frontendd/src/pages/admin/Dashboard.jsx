import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Loading, Modal, StatusBadge } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { getError } from "../../lib/format";

function AdminDashboard() {
  usePageTitle("Admin");
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);

  const load = () =>
    Promise.allSettled([api.get("/admin/dashboard"), api.get("/admin/users")]).then(([statsRes, usersRes]) => {
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data.stats);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data.users || []);
      if (statsRes.status === "rejected" && usersRes.status === "rejected") {
        setError(getError(usersRes.reason, "Admin data could not be loaded."));
      }
    });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([api.get("/admin/dashboard"), api.get("/admin/users")]).then(([statsRes, usersRes]) => {
      if (cancelled) return;
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data.stats);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data.users || []);
      if (statsRes.status === "rejected" && usersRes.status === "rejected") {
        setError(getError(usersRes.reason, "Admin data could not be loaded."));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return users.filter((person) => {
      const query = search.trim().toLowerCase();
      const matchesQuery = !query || person.name?.toLowerCase().includes(query) || person.email?.toLowerCase().includes(query);
      const matchesRole = role === "all" || person.role === role;
      const matchesStatus = status === "all" || (status === "blocked" ? person.isBlocked : !person.isBlocked);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, search, role, status]);

  const perPage = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleBlock = async (person) => {
    try {
      const response = await api.put(`/admin/users/${person._id}/block`);
      toast(response.data.message || "Updated.", "ok");
      await load();
    } catch (err) {
      toast(getError(err), "error");
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/admin/users/${pending._id}`);
      toast("Account deleted.", "ok");
      setPending(null);
      await load();
    } catch (err) {
      toast(getError(err), "error");
    }
  };

  if (!stats && !error) return <Loading label="Loading admin" />;

  const cards = stats
    ? [
        ["People", stats.totalUsers],
        ["Providers", stats.totalProviders],
        ["Customers", stats.totalCustomers],
        ["Bookings", stats.totalBookings],
        ["Reviews", stats.totalReviews],
      ]
    : [];

  const bars = stats
    ? [
        ["Pending", stats.pendingBookings],
        ["Accepted", stats.acceptedBookings],
        ["Completed", stats.completedBookings],
      ]
    : [];
  const maxBar = Math.max(...bars.map((item) => item[1]), 1);

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="section-title" style={{ margin: "8px 0 16px" }}>Overview</h1>
      {error ? <div className="note note-error">{error}</div> : null}
      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <article className="stat" key={label}>
            <span className="muted">{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      {stats ? (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Bookings</h2>
          <div className="bars" style={{ marginTop: 14 }}>
            {bars.map(([label, value]) => (
              <div className="bar-row" key={label}>
                <span>{label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(value / maxBar) * 100}%` }} />
                </div>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ marginTop: 22 }}>
        <h2>People</h2>
        <div className="toolbar">
          <input placeholder="Search name or email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
            <option value="all">All roles</option>
            <option value="customer">Customers</option>
            <option value="provider">Providers</option>
            <option value="admin">Admins</option>
          </select>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>City</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan="6">No one matches.</td></tr>
              ) : (
                visible.map((person) => (
                  <tr key={person._id}>
                    <td>{person.name}</td>
                    <td>{person.email}</td>
                    <td>{person.role}</td>
                    <td>{person.city || "—"}</td>
                    <td><StatusBadge status={person.isBlocked ? "blocked" : "active"} /></td>
                    <td>
                      <div className="cluster">
                        {person.role !== "admin" ? (
                          <button className="btn btn-line btn-sm" type="button" onClick={() => toggleBlock(person)}>
                            {person.isBlocked ? "Unblock" : "Block"}
                          </button>
                        ) : null}
                        {person.role !== "admin" ? (
                          <button className="btn btn-danger btn-sm" type="button" onClick={() => setPending(person)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
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
      </section>

      {pending ? (
        <Modal title="Delete this account?" onClose={() => setPending(null)}>
          <p>
            {pending.name} will be removed, along with their bookings and reviews. This cannot be undone.
          </p>
          <div className="cluster" style={{ marginTop: 14 }}>
            <button className="btn btn-danger" type="button" onClick={remove}>Delete account</button>
            <button className="btn btn-line" type="button" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default AdminDashboard;
