import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper, { cardMotionProps } from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import AdminPanelNav from "../components/AdminPanelNav";
import { getIcon } from "../lib/icons";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const MotionLink = motion.create(Link);

const adminCards = [
  {
    title: "Create Tournament",
    description: "Create, edit, and remove tournaments through the admin control panel.",
    to: "/admin/tournaments",
    iconName: "tournaments"
  },
  {
    title: "Manage Teams",
    description: "Update team details, leader assignments, and team membership data.",
    to: "/admin/teams",
    iconName: "teams"
  },
  {
    title: "Manage Matches",
    description: "Schedule matches, update maps, and remove stale match records.",
    to: "/admin/matches",
    iconName: "matches"
  },
  {
    title: "Submit Results",
    description: "Correct placements and kills with full result edit and delete access.",
    to: "/admin/results",
    iconName: "results"
  },
  {
    title: "Manage Users",
    description: "Create users, update roles, and remove old platform accounts.",
    to: "/admin/users",
    iconName: "admin"
  },
  {
    title: "Leaderboard Settings",
    description: "Control feature flags and leaderboard display settings from one page.",
    to: "/admin/settings",
    iconName: "settings"
  }
];

function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/admin/dashboard", { token })
      .then(setStats)
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  const statCards = stats ? [
    { label: "Total Teams", value: stats.total_teams },
    { label: "Active Tournaments", value: stats.active_tournaments },
    { label: "Matches Today", value: stats.matches_today },
    { label: "Total Users", value: stats.total_users },
    { label: "Prize Pool", value: `Rs. ${stats.total_prize_pool.toLocaleString()}` }
  ] : [];

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="dashboard"
        eyebrow="Admin Control"
        title="Admin Dashboard"
        description="Full tournament, team, match, result, user, and settings control from the IQ Matters admin system."
      />

      <AdminPanelNav />

      <motion.section className="page-card" {...cardMotionProps}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Platform Overview</span>
            <h2>Admin Snapshot</h2>
          </div>
          <p>Review current platform activity and jump directly into the core admin modules.</p>
        </div>
        {error ? <div className="form-message form-message--error">{error}</div> : null}
        <div className="stats-grid">
          {statCards.map((stat) => (
            <div key={stat.label} className="page-card stat-card">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </motion.section>

      <section className="dashboard-grid">
        {adminCards.map((card) => {
          const Icon = getIcon(card.iconName);

          return (
            <MotionLink key={card.to} to={card.to} className="page-card dashboard-card" {...cardMotionProps}>
              <div className="card-heading-row">
                <span className="dashboard-card__eyebrow">Admin Module</span>
                <Icon className="card-icon" size={22} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <span className="dashboard-card__cta">Open module</span>
            </MotionLink>
          );
        })}
      </section>
    </PageWrapper>
  );
}

export default AdminDashboard;
