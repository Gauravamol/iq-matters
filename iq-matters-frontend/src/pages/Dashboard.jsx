import React from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper, { cardMotionProps, cardTransition } from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import { getIcon } from "../lib/icons";
import { useAuth } from "../hooks/useAuth";

const MotionLink = motion.create(Link);

const userCards = [
  {
    title: "Join Tournament",
    description: "Browse active events, check entry details, and register your squad.",
    eyebrow: "Player Tool",
    to: "/tournaments",
    cta: "Open tournaments",
    iconName: "tournaments"
  },
  {
    title: "My Team",
    description: "View your linked roster, player list, and current team stats.",
    eyebrow: "Player Tool",
    to: "/team-dashboard",
    cta: "Open team",
    iconName: "teams"
  },
  {
    title: "My Matches",
    description: "Track scheduled or completed matches for joined events.",
    eyebrow: "Player Tool",
    to: "/matches",
    cta: "Open matches",
    iconName: "matches"
  },
  {
    title: "Leaderboard",
    description: "Check standings, kills, and points across tournaments.",
    eyebrow: "Player Tool",
    to: "/leaderboard",
    cta: "Open leaderboard",
    iconName: "leaderboard"
  },
  {
    title: "Stats Center",
    description: "Review team rankings, top fraggers, and player killboards.",
    eyebrow: "Player Tool",
    to: "/stats",
    cta: "Open stats",
    iconName: "stats"
  }
];

function DashboardCard({ card, index }) {
  const Icon = getIcon(card.iconName);
  const transition = { ...cardTransition, delay: Math.min(index * 0.04, 0.2) };

  return (
    <MotionLink className="page-card dashboard-card" to={card.to} {...cardMotionProps} transition={transition}>
      <div className="card-heading-row">
        <span className="dashboard-card__eyebrow">{card.eyebrow}</span>
        <Icon className="card-icon" size={22} />
      </div>
      <h3>{card.title}</h3>
      <p>{card.description}</p>
      <span className="dashboard-card__cta">{card.cta}</span>
    </MotionLink>
  );
}

function Dashboard() {
  const { user, team, joinedTournamentIds } = useAuth();

  if (user?.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const quickStats = [
    { label: "Role", value: user?.role || "user" },
    { label: "Team", value: team?.name || "No team linked" },
    { label: "Joined Events", value: joinedTournamentIds.length },
    { label: "Profile", value: user?.name || "Player" }
  ];

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="dashboard"
        eyebrow="Player Dashboard"
        title="User Dashboard"
        description="Access your team, tournaments, matches, and leaderboard from one esports-style dashboard."
      />

      <motion.section className="page-card" {...cardMotionProps}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Quick Overview</span>
            <h2>Player Snapshot</h2>
          </div>
          <p>Your account-linked actions and current platform position.</p>
        </div>
        <div className="stats-grid">
          {quickStats.map((stat, index) => (
            <motion.div key={stat.label} className="page-card stat-card" {...cardMotionProps} transition={{ ...cardMotionProps.transition, delay: Math.min(index * 0.04, 0.16) }}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <section className="dashboard-grid">
        {userCards.map((card, index) => (
          <DashboardCard key={card.title} card={card} index={index} />
        ))}
      </section>
    </PageWrapper>
  );
}

export default Dashboard;
