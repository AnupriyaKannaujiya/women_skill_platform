import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import { Stars } from "../components/ui";
import { usePageTitle } from "../lib/usePageTitle";
import { getError } from "../lib/format";

function Review() {
  usePageTitle("Write a review");
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!rating || !comment.trim()) {
      toast("Add a star rating and a comment.", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/reviews", {
        provider: id,
        rating,
        comment: comment.trim(),
      });
      toast(response.data.message || "Review saved.", "ok");
      navigate("/customer/dashboard");
    } catch (error) {
      toast(getError(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 640 }}>
      <p className="eyebrow">Review</p>
      <h1 className="section-title" style={{ margin: "8px 0 8px" }}>
        How was the work?
      </h1>
      <p className="muted" style={{ marginBottom: 14 }}>
        Reviews open only after a completed booking, and only once for each provider.
      </p>
      <Stars value={rating} onChange={setRating} />
      <label className="field" style={{ marginTop: 14 }}>
        <span>Comment</span>
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
      </label>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Saving…" : "Submit review"}
      </button>
    </form>
  );
}

export default Review;
