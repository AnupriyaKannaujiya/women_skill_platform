import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";
import { useAuth } from "../context/AuthContext";

function About() {
  usePageTitle("About");
  const { token, user } = useAuth();
  const signedIn = Boolean(token && user);
  return (
    <div className="container page narrow">
      <p className="eyebrow">About</p>
      <h1 className="section-title" style={{ margin: "8px 0 12px" }}>
        Skilled women, booked without a middle desk.
      </h1>
      <p className="lead">
        Women Skill is for women who earn from a skill at home, and for families who need that skill nearby. A customer sends a request. The provider accepts, rejects, or marks the work complete.
      </p>

      <div className="grid-3" style={{ marginTop: 28 }}>
        <article className="step">
          <h3>For customers</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            Search by skill and city, read the price and reviews, then send a date and address.
          </p>
        </article>
        <article className="step">
          <h3>For providers</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            Keep your own price, photos and description. Accept only the requests you want.
          </p>
        </article>
        <article className="step">
          <h3>For the visit</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            After she accepts, call or WhatsApp from the booking. Payment is still arranged between you.
          </p>
        </article>
      </div>

      <section className="card" style={{ marginTop: 22 }}>
        <h2>What happens to a booking</h2>
        <p style={{ marginTop: 8 }}>
          It starts as pending. The provider can accept or reject it. Accepted work can be marked completed. A customer can review a provider only after a completed booking, and only once.
        </p>
        <div className="cluster" style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" to="/providers">Find someone</Link>
          {signedIn ? null : <Link className="btn btn-line" to="/register">Create an account</Link>}
        </div>
      </section>
    </div>
  );
}

export default About;
