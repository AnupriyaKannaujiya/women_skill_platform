import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";

function NotFound() {
  usePageTitle("Page not found");
  return (
    <div className="container page narrow">
      <p className="eyebrow">404</p>
      <h1 className="section-title" style={{ margin: "8px 0 12px" }}>
        This page is not on the map.
      </h1>
      <p className="lead">The link may be old. The directory of women is still there.</p>
      <Link className="btn btn-primary" style={{ marginTop: 18 }} to="/providers">
        Find a woman
      </Link>
    </div>
  );
}

export default NotFound;
