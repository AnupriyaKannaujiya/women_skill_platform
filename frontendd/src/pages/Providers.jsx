import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import categories from "../data/categories";
import ProviderCard from "../components/ProviderCard";
import { Empty, Loading } from "../components/ui";
import { usePageTitle } from "../lib/usePageTitle";
import { getError } from "../lib/format";

const emptyFilters = {
  skill: "",
  city: "",
  area: "",
  minPrice: "",
  maxPrice: "",
  experience: "",
  rating: "",
  sort: "",
};

function readFilters(params) {
  return {
    skill: params.get("skill") || "",
    city: params.get("city") || "",
    area: params.get("area") || "",
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
    experience: params.get("experience") || "",
    rating: params.get("rating") || "",
    sort: params.get("sort") || "",
  };
}

function Providers() {
  usePageTitle("Find");
  const [params, setParams] = useSearchParams();
  const paramKey = params.toString();
  const [filters, setFilters] = useState(() => readFilters(params));
  const [seenParams, setSeenParams] = useState(paramKey);
  const [providers, setProviders] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, currentPage: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (seenParams !== paramKey) {
    setSeenParams(paramKey);
    setFilters(readFilters(params));
  }

  useEffect(() => {
    let cancelled = false;
    const query = Object.fromEntries(params.entries());
    query.limit = 9;
    if (!query.page) query.page = 1;

    api
      .get("/users/search", { params: query })
      .then((response) => {
        if (cancelled) return;
        setProviders(response.data.users || []);
        setMeta({
          total: response.data.total || 0,
          totalPages: response.data.totalPages || 1,
          currentPage: response.data.currentPage || 1,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(getError(err, "Could not load providers."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params]);

  const update = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const apply = (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    setLoading(true);
    setError("");
    setParams(next);
  };

  const clear = () => {
    setFilters(emptyFilters);
    setLoading(true);
    setError("");
    setParams(new URLSearchParams());
  };

  const go = (page) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    setLoading(true);
    setParams(next);
  };

  return (
    <div className="container page">
      <p className="eyebrow">Directory</p>
      <h1 className="section-title" style={{ margin: "8px 0 6px" }}>
        Find a woman for the work
      </h1>
      <p className="lead">Search by skill and city. Narrow it with price, experience and rating.</p>

      <div className="chip-row" style={{ margin: "16px 0 22px" }}>
        {categories.map((item) => (
          <button
            key={item.name}
            className={
              params.get("skill")?.toLowerCase() === item.query.toLowerCase() ? "chip active" : "chip"
            }
            type="button"
            aria-pressed={params.get("skill")?.toLowerCase() === item.query.toLowerCase()}
            onClick={() => {
              setLoading(true);
              setError("");
              setParams(new URLSearchParams({ skill: item.query }));
            }}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="filters">
        <form className="card filter-card" onSubmit={apply}>
          <h2 style={{ marginBottom: 12 }}>Filters</h2>
          {[
            ["skill", "Skill", "e.g. Mehndi"],
            ["city", "City", "e.g. Lucknow"],
            ["area", "Area", "e.g. Gomti Nagar"],
          ].map(([name, label, placeholder]) => (
            <label className="field" key={name}>
              <span>{label}</span>
              <input name={name} value={filters[name]} placeholder={placeholder} onChange={update} />
            </label>
          ))}
          <div className="field-row">
            <label className="field">
              <span>Min ₹</span>
              <input name="minPrice" type="number" min="0" value={filters.minPrice} onChange={update} />
            </label>
            <label className="field">
              <span>Max ₹</span>
              <input name="maxPrice" type="number" min="0" value={filters.maxPrice} onChange={update} />
            </label>
          </div>
          <label className="field">
            <span>Minimum experience (years)</span>
            <input name="experience" type="number" min="0" value={filters.experience} onChange={update} />
          </label>
          <label className="field">
            <span>Minimum rating</span>
            <select name="rating" value={filters.rating} onChange={update}>
              <option value="">Any</option>
              <option value="4">4 and above</option>
              <option value="3">3 and above</option>
            </select>
          </label>
          <label className="field">
            <span>Sort</span>
            <select name="sort" value={filters.sort} onChange={update}>
              <option value="">Recently added</option>
              <option value="ratingHigh">Highest rated</option>
              <option value="priceLow">Price, low to high</option>
              <option value="priceHigh">Price, high to low</option>
            </select>
          </label>
          <button className="btn btn-primary btn-block" type="submit">
            Apply
          </button>
          <button className="btn btn-line btn-block" type="button" style={{ marginTop: 8 }} onClick={clear}>
            Clear
          </button>
        </form>

        <div>
          <div className="results-head">
            <p className="muted">{loading ? "Searching…" : `${meta.total} profile${meta.total === 1 ? "" : "s"}`}</p>
          </div>
          {error ? <div className="note note-error">{error}</div> : null}
          {loading ? <Loading label="Searching profiles" /> : null}
          {!loading && !error && providers.length === 0 ? (
            <Empty
              title="No one matches"
              text="Try a wider city, or clear the price and rating filters."
            />
          ) : null}
          <div className="grid-3">
            {providers.map((provider) => (
              <ProviderCard key={provider._id} provider={provider} />
            ))}
          </div>
          {meta.totalPages > 1 ? (
            <div className="pager">
              <button
                className="btn btn-line"
                type="button"
                disabled={meta.currentPage <= 1}
                onClick={() => go(meta.currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {meta.currentPage} of {meta.totalPages}
              </span>
              <button
                className="btn btn-line"
                type="button"
                disabled={meta.currentPage >= meta.totalPages}
                onClick={() => go(meta.currentPage + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Providers;
