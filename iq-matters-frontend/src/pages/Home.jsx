import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageWrapper, { cardMotionProps } from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import ActionButton from "../components/ActionButton";
import PageVideoSection from "../components/PageVideoSection";
import EsportsDataSection from "../components/EsportsDataSection";
import ResourceSection from "../components/ResourceSection";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const homeVideos = [
  {
    title: "iQOO BMPS 2024 Teaser",
    description: "Official KRAFTON India Esports tournament promo content.",
    source: "https://www.youtube.com/watch?v=77uJNk-l2gE"
  },
  {
    title: "KRAFTON India Esports Feature",
    description: "Official BGMI esports video content from KRAFTON India's competitive ecosystem.",
    source: "https://youtu.be/7IM8KjG5Y7g?si=dwy1XnKPfcpG7fnH"
  }
];

function Home() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState({ tournaments: 0, teams: 0, prizePool: 0 });

  useEffect(() => {
    Promise.all([apiRequest("/tournaments"), apiRequest("/leaderboard")])
      .then(([tournaments, teams]) => {
        const prizePool = tournaments.reduce((sum, item) => sum + Number(item.prize_pool || 0), 0);
        setStats({ tournaments: tournaments.length, teams: teams.length, prizePool });
      })
      .catch(() => {
        setStats({ tournaments: 0, teams: 0, prizePool: 0 });
      });
  }, []);

  const statCards = [
    { label: "Tournaments", value: stats.tournaments },
    { label: "Teams", value: stats.teams },
    { label: "Total Prize Pool", value: `Rs. ${stats.prizePool.toLocaleString()}` }
  ];

  const actions = isAuthenticated ? (
    <ActionButton to="/dashboard" iconName="dashboard">Open Dashboard</ActionButton>
  ) : (
    <>
      <ActionButton to="/register" iconName="register">Register</ActionButton>
      <ActionButton to="/login" iconName="login" className="nav-button nav-button--ghost">Login</ActionButton>
    </>
  );

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="home"
        eyebrow="BGMI Tournament Platform"
        title="IQ Matters"
        description="Tournament operations, team tracking, leaderboard control, external esports data, and media-rich presentation from a single esports-grade platform."
        actions={actions}
      />

      <div className="stats-grid">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            className="page-card stat-card"
            {...cardMotionProps}
            transition={{ ...cardMotionProps.transition, delay: index * 0.04 }}
          >
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </motion.div>
        ))}
      </div>

      <PageVideoSection
        slot="home-video"
        title="Featured Esports Broadcasts"
        description="Official BGMI esports and tournament media can be swapped from the admin media panel at any time."
        fallbackVideos={homeVideos}
      />

      <EsportsDataSection />
      <ResourceSection />
    </PageWrapper>
  );
}

export default Home;
