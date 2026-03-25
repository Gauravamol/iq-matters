import React from "react";
import { NavLink } from "react-router-dom";
import { getIcon } from "../lib/icons";

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", iconName: "dashboard" },
  { to: "/admin/tournaments", label: "Tournaments", iconName: "tournaments" },
  { to: "/admin/teams", label: "Teams", iconName: "teams" },
  { to: "/admin/matches", label: "Matches", iconName: "matches" },
  { to: "/admin/results", label: "Results", iconName: "results" },
  { to: "/admin/users", label: "Users", iconName: "teams" },
  { to: "/admin/settings", label: "Settings", iconName: "settings" }
];

function AdminPanelNav() {
  return (
    <nav className="admin-nav">
      {adminLinks.map((link) => {
        const Icon = getIcon(link.iconName);

        return (
          <NavLink key={link.to} to={link.to} className="admin-nav__link">
            <Icon size={16} />
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default AdminPanelNav;
