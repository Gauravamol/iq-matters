import { NavLink } from "react-router-dom";
import Button from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";

const guestLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/tournaments", label: "Tournaments" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/matches", label: "Matches" }
];

export default function MainNav() {
  const { isAuthenticated, user, logout } = useAuth();

  const links = [...guestLinks];

  if (isAuthenticated) {
    links.push({ to: "/dashboard", label: "Player HQ" });
  }

  if (user?.role === "admin") {
    links.push({ to: "/admin", label: "Admin Panel" });
  }

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo">IQ</span>
        <div>
          <strong>IQ Matters</strong>
          <p>BGMI tournament command platform</p>
        </div>
      </div>

      <nav className="topbar__nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className="topbar__link">
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="topbar__actions">
        {isAuthenticated ? (
          <>
            <span className="topbar__user">{user?.name}</span>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </>
        ) : (
          <>
            <Button as={NavLink} to="/login" variant="ghost">Login</Button>
            <Button as={NavLink} to="/register">Register</Button>
          </>
        )}
      </div>
    </header>
  );
}
