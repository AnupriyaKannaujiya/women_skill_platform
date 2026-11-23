import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <h3>Women Skill</h3>
          <p className="muted">
            A place to find skilled women for work at home, and for those women to take bookings in their own name.
          </p>
        </div>
        <div>
          <strong>Browse</strong>
          <Link to="/providers">Find a woman</Link>
          <Link to="/providers?sort=ratingHigh">Highest rated</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div>
          <strong>Join</strong>
          <Link to="/register">Create an account</Link>
          <Link to="/login">Log in</Link>
        </div>
      </div>
      <div className="container legal">Women Skill · bookings stay between the customer and the provider.</div>
    </footer>
  );
}

export default Footer;
