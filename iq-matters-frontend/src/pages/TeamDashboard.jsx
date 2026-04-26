import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageWrapper, { cardMotionProps } from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import ActionButton from "../components/ActionButton";
import TeamIdentity from "../components/TeamIdentity";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

function TeamDashboard() {
  const { token, user, team } = useAuth();
  const [players, setPlayers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!team) {
      setPlayers([]);
      setProfile(null);
      return;
    }

    Promise.all([
      apiRequest(`/players/${team.id}`, { token }),
      apiRequest(`/team-profile/${team.id}`, { token })
    ])
      .then(([playerRows, profileData]) => {
        setPlayers(playerRows || []);
        setProfile(profileData || null);
        setError("");
      })
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

  const overall = profile?.overall || {
    total_points: team.total_points,
    total_kills: team.total_kills,
    matches_played: team.matches_played,
    average_placement: null
  };

  const teamStats = [
    { label: "Total Points", value: overall.total_points },
    { label: "Total Kills", value: overall.total_kills },
    { label: "Matches Played", value: overall.matches_played },
    { label: "Average Placement", value: overall.average_placement ?? "-" }
  ];

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="team-dashboard"
        eyebrow="Team HUD"
        title={team.name}
        description="Track overall career totals and tournament-by-tournament ranking history for your team."
      />

      <motion.section className="page-card" {...cardMotionProps}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Team Core</span>
            <TeamIdentity name={team.name} logoUrl={team.logo_url} />
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
            <span className="eyebrow">Tournament History</span>
            <h3>Performance by Tournament</h3>
          </div>
        </div>

        {profile?.tournament_history?.length ? (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Tournament</th>
                <th>Matches</th>
                <th>Kills</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {profile.tournament_history.map((row) => (
                <tr key={`${row.tournament_id}-${row.rank}`} className="leaderboard-row">
                  <td>#{row.rank}</td>
                  <td>{row.tournament_name}</td>
                  <td>{row.matches_played}</td>
                  <td>{row.total_kills}</td>
                  <td>{row.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No tournament history available yet.</p>
        )}
      </motion.section>

      <motion.section className="page-card" {...cardMotionProps} transition={{ duration: 0.28, ease: "easeOut", delay: 0.08 }}>
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
              <TeamIdentity name={player.player_name} logoUrl={player.logo_url} subtitle={player.player_uid} />
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
