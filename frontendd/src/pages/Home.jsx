import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import categories from "../data/categories";
import ProviderCard from "../components/ProviderCard";
import { Loading } from "../components/ui";
import { usePageTitle } from "../lib/usePageTitle";
import { formatMoney, skillLabel } from "../lib/format";

function Home() {
  usePageTitle("Find skilled women");
  const navigate = useNavigate();
  const [skill, setSkill] = useState("");
  const [city, setCity] = useState("");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/users/search", { params: { sort: "ratingHigh", limit: 6 } })
      .then((response) => {
        if (!cancelled) setProviders(response.data.users || []);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const search = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (skill.trim()) params.set("skill", skill.trim());
    if (city.trim()) params.set("city", city.trim());
    navigate(`/providers?${params.toString()}`);
  };

  const preview = providers.slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">A marketplace for skilled women</p>
            <h1 className="display" style={{ marginTop: 12 }}>
              Book a skilled woman near your home.
            </h1>
            <p className="lead" style={{ marginTop: 16 }}>
              Mehndi, tailoring, tuition, cooking, beauty and more. You send a request. She accepts. The work happens at your place.
            </p>
            <form className="hero-search" onSubmit={search}>
              <input
                aria-label="Skill"
                placeholder="Skill, such as mehndi"
                value={skill}
                onChange={(event) => setSkill(event.target.value)}
              />
              <input
                aria-label="City"
                placeholder="Your city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
              <button className="btn btn-primary" type="submit">
                Search
              </button>
            </form>
            <div className="trust">
              <span>Browse without an account</span>
              <span>Reviews after the work is done</span>
              <span>Her number is shared once she accepts</span>
            </div>
          </div>
          <aside className="hero-stage">
            <div className="stage-card">
              <div className="stage-top">
                <strong>Open a profile</strong>
                <span className="muted">price, city, reviews</span>
              </div>
              <div className="mini-list">
                {preview.length ? (
                  preview.map((provider) => (
                    <Link className="mini-person" key={provider._id} to={`/providers/${provider._id}`}>
                      <span>
                        <strong>{provider.name}</strong>
                        <br />
                        <span className="muted">{skillLabel(provider.skill)}</span>
                      </span>
                      <span>{formatMoney(provider.price)}</span>
                    </Link>
                  ))
                ) : (
                  categories.slice(0, 4).map((item) => (
                    <Link key={item.name} to={`/providers?skill=${encodeURIComponent(item.query)}`}>
                      <span>{item.name}</span>
                      <span>Search</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
            <p style={{ margin: "16px 8px 4px" }}>
              Women keep their own price. You agree the visit directly. There is no middle desk in between.
            </p>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Skills</p>
              <h2 className="section-title">What people book</h2>
            </div>
            <Link to="/providers">See everyone</Link>
          </div>
          <div className="cat-grid">
            {categories.map((item) => (
              <Link className="cat-card" key={item.name} to={`/providers?skill=${encodeURIComponent(item.query)}`}>
                <strong>{item.name}</strong>
                <span className="muted">{item.blurb}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Profiles</p>
              <h2 className="section-title">Women ready for work</h2>
            </div>
          </div>
          {loading ? <Loading label="Looking up profiles" /> : null}
          {!loading && providers.length === 0 ? (
            <div className="empty">
              <h3>No profiles yet</h3>
              <p>When providers join, their cards will show here.</p>
            </div>
          ) : null}
          <div className="grid-3">
            {providers.map((provider) => (
              <ProviderCard key={provider._id} provider={provider} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="eyebrow">Booking</p>
          <h2 className="section-title" style={{ margin: "8px 0 16px" }}>
            How a request moves
          </h2>
          <div className="grid-4">
            {[
              ["01", "Search", "Filter by skill, city, price and rating."],
              ["02", "Read", "Check her price, photos and reviews."],
              ["03", "Request", "Send the date, address and what you need."],
              ["04", "Confirm", "She accepts. Then you call or message on WhatsApp."],
            ].map(([index, title, text]) => (
              <article className="step" key={index}>
                <em>{index}</em>
                <h3 style={{ margin: "8px 0" }}>{title}</h3>
                <p className="muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        <section className="band">
          <div>
            <h2 className="section-title">Do the work in your own name.</h2>
            <p>Add your skill, city and price. Customers nearby can request you. You accept only the work you want.</p>
          </div>
          <Link className="btn btn-primary" to="/register">
            Join as a provider
          </Link>
        </section>
      </div>
    </>
  );
}

export default Home;
