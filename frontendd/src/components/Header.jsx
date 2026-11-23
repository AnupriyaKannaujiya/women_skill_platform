import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import Brand from "./Brand";
import { Avatar } from "./ui";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../lib/format";

function Header() {
  const { token, user, logout } = useAuth();
  const [navPath, setNavPath] = useState("");
  const [menuPath, setMenuPath] = useState("");
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const open = navPath === location.pathname;
  const menu = menuPath === location.pathname;

  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuPath("");
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const exit = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="header">
      <div className="container header-bar">
        <Brand />
        <button
          className="nav-toggle"
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setNavPath(open ? "" : location.pathname)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={open ? "nav open" : "nav"}>
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/providers">Find</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          {token && user ? (
            <div className="account" ref={menuRef}>
              <button className="account-btn" type="button" onClick={() => setMenuPath(menu ? "" : location.pathname)}>
                <Avatar name={user.name} src={user.photo} size="sm" />
                <span>{user.name?.split(" ")[0] || "Account"}</span>
              </button>
              {menu ? (
                <div className="menu">
                  <button type="button" onClick={() => navigate(homeFor(user.role))}>
                    Dashboard
                  </button>
                  <button type="button" onClick={() => navigate("/account/profile")}>
                    Profile
                  </button>
                  <button type="button" onClick={() => navigate("/account/password")}>
                    Password
                  </button>
                  {user.role === "provider" ? (
                    <button type="button" onClick={() => navigate("/provider/portfolio")}>
                      Portfolio
                    </button>
                  ) : null}
                  {user.role === "admin" ? (
                    <button type="button" onClick={() => navigate("/admin/bookings")}>
                      Bookings
                    </button>
                  ) : null}
                  <button className="danger" type="button" onClick={exit}>
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="nav-auth">
              <NavLink to="/login">Log in</NavLink>
              <NavLink className="btn btn-primary btn-sm" to="/register">
                Join
              </NavLink>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
