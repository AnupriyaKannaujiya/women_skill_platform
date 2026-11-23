import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, ConfirmModal, Empty, Loading, Modal, Stars } from "../components/ui";
import { usePageTitle } from "../lib/usePageTitle";
import {
  formatDate,
  formatMoney,
  getError,
  phoneHref,
  plural,
  skillList,
  whatsappHref,
} from "../lib/format";

function ProviderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const toast = useToast();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [shot, setShot] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ rating: 5, comment: "" });
  const [myBookings, setMyBookings] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  usePageTitle(provider?.name || "Profile");

  const load = () => {
    setError("");
    return api
      .get(`/users/${id}`)
      .then((response) => {
        setProvider(response.data.user);
        setReviews(response.data.reviews || []);
      })
      .catch((err) => setError(getError(err, "This profile could not be opened.")));
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/users/${id}`)
      .then((response) => {
        if (cancelled) return;
        setProvider(response.data.user);
        setReviews(response.data.reviews || []);
      })
      .catch((err) => {
        if (!cancelled) setError(getError(err, "This profile could not be opened."));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // A logged-in customer's bookings with this provider decide whether her
  // contact details and the "Write a review" button are shown.
  useEffect(() => {
    if (!token || user?.role !== "customer") return undefined;
    let cancelled = false;
    api
      .get("/bookings/my")
      .then((response) => {
        if (cancelled) return;
        const mine = (response.data.bookings || []).filter((booking) => booking.provider?._id === id);
        setMyBookings(mine);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, token, user?.role]);

  const book = () => {
    if (!token) {
      navigate("/login", { state: { from: { pathname: `/booking/${id}` } } });
      return;
    }
    if (user?.role !== "customer") {
      toast("Booking is available on a customer account.", "error");
      return;
    }
    navigate(`/booking/${id}`);
  };

  const removeReview = async (reviewId) => {
    try {
      await api.delete(`/reviews/${reviewId}`);
      toast("Review removed.", "ok");
      load();
    } catch (err) {
      toast(getError(err), "error");
    }
  };

  const saveReview = async (event) => {
    event.preventDefault();
    try {
      await api.put(`/reviews/${editing}`, draft);
      toast("Review updated.", "ok");
      setEditing(null);
      load();
    } catch (err) {
      toast(getError(err), "error");
    }
  };

  if (error) {
    return (
      <div className="container page">
        <div className="note note-error">{error}</div>
      </div>
    );
  }
  if (!provider) {
    return (
      <div className="container page">
        <Loading label="Opening profile" />
      </div>
    );
  }

  const skills = skillList(provider.skill);
  // Contact details come only from this customer's own accepted/completed booking.
  const contact = myBookings.find(
    (booking) => booking.provider?.phone || booking.provider?.whatsapp,
  )?.provider || {};
  const wa = whatsappHref(contact.whatsapp);
  const call = phoneHref(contact.phone);
  const hasCompleted = myBookings.some((booking) => booking.status === "completed");
  const alreadyReviewed = reviews.some((review) => review.reviewer?._id === user?._id);
  const canReview = user?.role === "customer" && hasCompleted && !alreadyReviewed;

  return (
    <div className="container page">
      <div className="profile-layout">
        <aside className="card profile-side">
          <div className="center">
            <Avatar name={provider.name} src={provider.photo} size="lg" />
            <h1 className="section-title" style={{ fontSize: "2rem" }}>
              {provider.name}
            </h1>
            <p className="muted">{[provider.area, provider.city].filter(Boolean).join(", ") || "Location not added"}</p>
            <Stars value={provider.rating || 0} />
            <p className="muted">
              {provider.totalReviews ? plural(provider.totalReviews, "review") : "No reviews yet"}
            </p>
          </div>
          <div className="chip-row" style={{ margin: "14px 0" }}>
            {skills.length ? skills.map((skill) => <span className="chip" key={skill}>{skill}</span>) : <span className="chip">Skill not added</span>}
          </div>
          <p className="price">{formatMoney(provider.price)}</p>
          <p className="muted" style={{ marginBottom: 14 }}>
            {provider.experience ? `${provider.experience} years of experience` : "Experience not added"}
          </p>
          <button className="btn btn-primary btn-block" type="button" onClick={book}>
            Request a booking
          </button>
          {wa || call ? (
            <>
              {wa ? (
                <a className="btn btn-sage btn-block" style={{ marginTop: 8 }} href={wa} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              ) : null}
              {call ? (
                <a className="btn btn-line btn-block" style={{ marginTop: 8 }} href={call}>
                  Call {contact.phone}
                </a>
              ) : null}
            </>
          ) : (
            <p className="help" style={{ marginTop: 10 }}>
              Her phone and WhatsApp are shared with you once she accepts your request.
            </p>
          )}
        </aside>

        <div>
          <section className="card" style={{ marginBottom: 16 }}>
            <h2>About</h2>
            <p style={{ marginTop: 8 }}>{provider.description || "She has not written a description yet."}</p>
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2>Portfolio</h2>
            {provider.portfolio?.length ? (
              <div className="portfolio-grid" style={{ marginTop: 12 }}>
                {provider.portfolio.map((image) => (
                  <button key={image._id || image.url} type="button" onClick={() => setShot(image.url)}>
                    <img src={image.url} alt={`${provider.name} portfolio`} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ marginTop: 8 }}>No work photos yet.</p>
            )}
          </section>

          <section className="card">
            <h2>Reviews</h2>
            {reviews.length === 0 ? (
              <Empty title="No reviews yet" text="A review can be written after a completed booking." />
            ) : (
              reviews.map((review) => {
                const mine = user && review.reviewer?._id === user._id;
                return (
                  <article className="review" key={review._id}>
                    <div className="person">
                      <Avatar name={review.reviewer?.name} src={review.reviewer?.photo} size="sm" />
                      <div>
                        <strong>{review.reviewer?.name || "Customer"}</strong>
                        <div><Stars value={review.rating} /></div>
                      </div>
                    </div>
                    {editing === review._id ? (
                      <form onSubmit={saveReview} style={{ marginTop: 10 }}>
                        <Stars value={draft.rating} onChange={(rating) => setDraft((current) => ({ ...current, rating }))} />
                        <label className="field" style={{ marginTop: 8 }}>
                          <span>Comment</span>
                          <textarea
                            value={draft.comment}
                            onChange={(event) => setDraft((current) => ({ ...current, comment: event.target.value }))}
                          />
                        </label>
                        <div className="cluster">
                          <button className="btn btn-primary btn-sm" type="submit">Save</button>
                          <button className="btn btn-line btn-sm" type="button" onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p style={{ marginTop: 8 }}>{review.comment}</p>
                        <p className="muted" style={{ marginTop: 4 }}>{formatDate(review.createdAt)}</p>
                        {mine ? (
                          <div className="cluster" style={{ marginTop: 8 }}>
                            <button
                              className="btn btn-line btn-sm"
                              type="button"
                              onClick={() => {
                                setEditing(review._id);
                                setDraft({ rating: review.rating, comment: review.comment || "" });
                              }}
                            >
                              Edit
                            </button>
                            <button className="btn btn-line btn-sm" type="button" onClick={() => setConfirmDelete(review._id)}>
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </article>
                );
              })
            )}
            {token && canReview ? (
              <Link className="btn btn-line" style={{ marginTop: 12 }} to={`/review/${provider._id}`}>
                Write a review
              </Link>
            ) : null}
          </section>
        </div>
      </div>
      {shot ? (
        <Modal title="Portfolio" wide onClose={() => setShot("")}>
          <img src={shot} alt="" />
        </Modal>
      ) : null}
      {confirmDelete ? (
        <ConfirmModal
          title="Delete your review?"
          text="This removes your rating and comment from her profile. You cannot undo this."
          confirmLabel="Delete review"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            const reviewId = confirmDelete;
            setConfirmDelete(null);
            await removeReview(reviewId);
          }}
        />
      ) : null}
    </div>
  );
}

export default ProviderDetails;
