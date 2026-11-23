import { Link } from "react-router-dom";

function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="mark" aria-hidden="true">
        W
      </span>
      <span>
        <strong>Women Skill</strong>
        <small>work, booked nearby</small>
      </span>
    </Link>
  );
}

export default Brand;
