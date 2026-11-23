import { Link } from "react-router-dom";
import { Avatar, Stars } from "./ui";
import { formatMoney, plural, skillLabel } from "../lib/format";

function ProviderCard({ provider }) {
  const place = [provider.area, provider.city].filter(Boolean).join(", ");
  return (
    <article className="provider-card">
      <div className="person">
        <Avatar name={provider.name} src={provider.photo} />
        <div>
          <h3>{provider.name}</h3>
          <p className="muted">{place || "City not added"}</p>
        </div>
      </div>
      <p className="provider-skill">{skillLabel(provider.skill)}</p>
      <div className="cluster">
        <Stars value={provider.rating || 0} />
        <span className="muted">
          {provider.totalReviews ? plural(provider.totalReviews, "review") : "No reviews yet"}
        </span>
      </div>
      <div className="provider-foot">
        <strong className="price">{formatMoney(provider.price)}</strong>
        <span className="muted">
          {provider.experience ? `${plural(provider.experience, "yr")} exp.` : "New profile"}
        </span>
      </div>
      <Link className="btn btn-dark btn-block" to={`/providers/${provider._id}`}>
        View profile
      </Link>
    </article>
  );
}

export default ProviderCard;
