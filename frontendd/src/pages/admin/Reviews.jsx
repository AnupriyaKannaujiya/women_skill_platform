import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Loading, Modal, Stars } from "../../components/ui";
import { usePageTitle } from "../../lib/usePageTitle";
import { formatDate, getError } from "../../lib/format";

function AdminReviews() {
  usePageTitle("Reviews");
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);

  const load = () =>
    api.get("/admin/reviews").then((response) => setReviews(response.data.reviews || []));

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((err) => {
        if (!cancelled) setError(getError(err, "Could not load reviews."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = async () => {
    try {
      const response = await api.delete(`/admin/reviews/${pending._id}`);
      toast(response.data.message || "Review deleted.", "ok");
      setPending(null);
      await load();
    } catch (err) {
      toast(getError(err), "error");
    }
  };

  if (loading) return <Loading label="Loading reviews" />;

  return (
    <div>
      <p className="eyebrow">Admin</p>
      <h1 className="section-title" style={{ margin: "8px 0 12px" }}>Reviews</h1>
      {error ? <div className="note note-error">{error}</div> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Provider</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr><td colSpan="6">No reviews yet.</td></tr>
            ) : (
              reviews.map((review) => (
                <tr key={review._id}>
                  <td>{review.reviewer?.name}</td>
                  <td>{review.provider?.name}</td>
                  <td><Stars value={review.rating} /></td>
                  <td>{review.comment}</td>
                  <td>{formatDate(review.createdAt)}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => setPending(review)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pending ? (
        <Modal title="Delete this review?" onClose={() => setPending(null)}>
          <p>The comment from {pending.reviewer?.name || "this customer"} will be removed.</p>
          <div className="cluster" style={{ marginTop: 14 }}>
            <button className="btn btn-danger" type="button" onClick={remove}>Delete review</button>
            <button className="btn btn-line" type="button" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default AdminReviews;
