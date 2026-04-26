import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { getIcon } from "../lib/icons";
import { useAuth } from "../hooks/useAuth";
import ActionButton from "./ActionButton";

function NavItem({ to, label, iconName, end = false }) {
  const Icon = getIcon(iconName);

  return (
    <NavLink to={to} end={end} className="topbar__nav-link">
      <Icon size={16} />
      <span>{label}</span>
    </NavLink>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const dashboardPath = user?.role === "admin" ? "/admin/dashboard" : "/dashboard";

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="topbar">
      <Link to="/" className="brand-mark" aria-label="IQ Matters home">
        <img src="/logo.svg" alt="" className="brand-mark__logo" width="42" height="42" />
        <span className="brand-mark__text">IQ Matters</span>
      </Link>

      <nav className="topbar__links">
        <NavItem to="/" label="Home" iconName="dashboard" end />
        <NavItem to="/tournaments" label="Tournaments" iconName="tournaments" />
        <NavItem to="/matches" label="Matches" iconName="matches" />
        <NavItem to="/leaderboard" label="Leaderboard" iconName="leaderboard" />
        {isAuthenticated ? <NavItem to={dashboardPath} label="Dashboard" iconName="dashboard" /> : null}
      </nav>

      <div className="topbar__actions">
        {isAuthenticated ? (
          <>
            <span className="topbar__user">{user?.name}</span>
            <ActionButton iconName="logout" className="nav-button nav-button--ghost" onClick={handleLogout}>Logout</ActionButton>
          </>
        ) : (
          <>
            <ActionButton to="/login" iconName="login" className="nav-button nav-button--ghost">Login</ActionButton>
            <ActionButton to="/register" iconName="register">Register</ActionButton>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;
