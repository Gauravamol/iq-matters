import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageWrapper, { cardMotionProps } from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import ActionButton from "../components/ActionButton";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

function TeamDashboard() {
  const { token, user, team } = useAuth();
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!team) {
      setPlayers([]);
      return;
    }

    apiRequest(`/players/${team.id}`, { token })
      .then(setPlayers)
      .catch((requestError) => setError(requestError.message));
  }, [team, token]);

  if (!team) {
    return (
      <PageWrapper className="stack-layout">
        <HeroMediaBanner
          page="team-dashboard"
          eyebrow="Team HUD"
          title="Team Dashboard"
          description="Create a squad, build your roster, and unlock team tournament access from the player dashboard."
        />

        <motion.div className="page-card" {...cardMotionProps}>
          <h2>Team Dashboard</h2>
          <p>Your account is authenticated, but you do not have a team linked yet.</p>
          <ActionButton to="/create-team" iconName="teams">Create Team</ActionButton>
        </motion.div>
      </PageWrapper>
    );
  }

  const teamStats = [
    { label: "Total Points", value: team.total_points },
    { label: "Total Kills", value: team.total_kills },
    { label: "Matches Played", value: team.matches_played }
  ];

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="team-dashboard"
        eyebrow="Team HUD"
        title={team.name}
        description="Track roster members, total kills, points, and active tournament access from the team operations view."
      />

      <motion.section className="page-card" {...cardMotionProps}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Team Core</span>
            <h2>{team.name}</h2>
          </div>
          <p>Leader ID: {user?.id}</p>
        </div>
        <div className="stats-grid">
          {teamStats.map((stat, index) => (
            <motion.div key={stat.label} className="page-card stat-card" {...cardMotionProps} transition={{ ...cardMotionProps.transition, delay: index * 0.04 }}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section className="page-card" {...cardMotionProps} transition={{ duration: 0.28, ease: "easeOut", delay: 0.06 }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Roster</span>
            <h3>Players</h3>
          </div>
          {error ? <div className="form-message form-message--error">{error}</div> : null}
        </div>
        <ul className="data-list">
          {players.map((player, index) => (
            <motion.li key={player.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: Math.min(index * 0.04, 0.2), ease: "easeOut" }}>
              <strong>{player.player_name}</strong>
              <span>{player.player_uid}</span>
            </motion.li>
          ))}
        </ul>
      </motion.section>

      <section className="button-row">
        <ActionButton to="/tournaments" iconName="tournaments">Join Tournament</ActionButton>
        <ActionButton to="/matches" iconName="matches" className="nav-button nav-button--ghost">My Matches</ActionButton>
        <ActionButton to="/leaderboard" iconName="leaderboard" className="nav-button nav-button--ghost">Leaderboard</ActionButton>
      </section>
    </PageWrapper>
  );
}

export default TeamDashboard;
