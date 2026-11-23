import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../lib/format";

function isProviderApp(pathname) {
  return pathname === "/provider" || pathname.startsWith("/provider/");
}

function requiredRole(pathname) {
  if (pathname.startsWith("/admin")) return "admin";
  if (isProviderApp(pathname)) return "provider";
  if (
    pathname.startsWith("/customer") ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/review")
  ) {
    return "customer";
  }
  return null;
}

function isAppPath(pathname) {
  return (
    pathname.startsWith("/customer") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/review") ||
    isProviderApp(pathname)
  );
}

function SideNav() {
  const { user } = useAuth();
  const links = [{ to: "/account/profile", label: "Profile" }, { to: "/account/password", label: "Password" }];

  if (user?.role === "customer") {
    links.unshift({ to: "/customer/dashboard", label: "My bookings" });
    links.push({ to: "/providers", label: "Find someone" });
  }
  if (user?.role === "provider") {
    links.unshift(
      { to: "/provider/dashboard", label: "Requests" },
      { to: "/provider/portfolio", label: "Portfolio" },
    );
  }
  if (user?.role === "admin") {
    links.unshift(
      { to: "/admin", label: "Overview", end: true },
      { to: "/admin/bookings", label: "Bookings" },
      { to: "/admin/reviews", label: "Reviews" },
    );
  }

  return (
    <aside className="side">
      <p className="eyebrow side-kicker">{user?.role}</p>
      <nav>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? "side-link active" : "side-link")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function Frame() {
  const { pathname } = useLocation();
  const location = useLocation();
  const { token, user } = useAuth();
  const app = isAppPath(pathname);
  const bare = pathname === "/login" || pathname === "/register";

  if (app) {
    if (!token || !user) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    const role = requiredRole(pathname);
    if (role && user.role !== role) {
      return <Navigate to={homeFor(user.role)} replace />;
    }
    return (
      <div className="frame">
        <Header />
        <div className="container shell">
          <SideNav />
          <div className="side-main">
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="frame">
      {bare ? null : <Header />}
      <main className="main">
        <Outlet />
      </main>
      {bare ? null : <Footer />}
    </div>
  );
}
