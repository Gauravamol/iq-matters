import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Medal, Trophy } from "lucide-react";
import PageWrapper, { cardMotionProps, getRowMotion } from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import TeamIdentity from "../components/TeamIdentity";
import { usePlatform } from "../context/PlatformContext";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

function RankDisplay({ rank }) {
  if (rank === 1) {
    return <span className="rank-pill rank-pill--gold"><Trophy size={16} /> #1</span>;
  }

  if (rank === 2 || rank === 3) {
    return <span className="rank-pill rank-pill--elite"><Medal size={16} /> #{rank}</span>;
  }

  return <span className="rank-pill">#{rank}</span>;
}

function Leaderboard() {
  const { token, joinedTournamentIds } = useAuth();
  const { isFeatureEnabled } = usePlatform();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [teams, setTeams] = useState([]);
  const [settings, setSettings] = useState({ bg_image: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/tournaments", { token })
      .then((data) => {
        setTournaments(data || []);
        const preferredId = joinedTournamentIds[0] || data?.[0]?.id;
        if (preferredId) {
          setSelectedTournamentId(String(preferredId));
        }
      })
      .catch((requestError) => setError(requestError.message));

    apiRequest("/leaderboard-settings")
      .then((data) => setSettings(data || { bg_image: "" }))
      .catch(() => setSettings({ bg_image: "" }));
  }, [token, joinedTournamentIds]);

  useEffect(() => {
    if (!selectedTournamentId) {
      return;
    }

    apiRequest(`/leaderboard/${selectedTournamentId}`, { token })
      .then(setTeams)
      .catch((requestError) => setError(requestError.message));
  }, [selectedTournamentId, token]);

  const backgroundEnabled = isFeatureEnabled("leaderboard_background", true);
  const tableStyle = backgroundEnabled && settings?.bg_image
    ? { backgroundImage: `linear-gradient(rgba(7, 17, 30, 0.82), rgba(7, 17, 30, 0.94)), url(${settings.bg_image})`, backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="leaderboard"
        eyebrow="Standings"
        title="Leaderboard"
        description="Highlight top teams, compare kills and points, and run the leaderboard against optional branded backgrounds."
      />

      <motion.section className="page-card" {...cardMotionProps}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Standings Control</span>
            <h2>Tournament Rankings</h2>
          </div>
          <p>Switch tournaments instantly and track rank progression with animated rows and highlighted top teams.</p>
        </div>
        {tournaments.length ? (
          <select className="form-input" value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)}>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
            ))}
          </select>
        ) : null}
        {error ? <div className="form-message form-message--error">{error}</div> : null}
      </motion.section>

      <motion.div className="page-card leaderboard-surface" style={tableStyle} {...cardMotionProps} transition={{ duration: 0.3, ease: "easeOut", delay: 0.06 }}>
        <table className="leaderboard-table">
          <thead>
            <motion.tr initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: "easeOut" }}>
              <th>Rank</th>
              <th>Team</th>
              <th>Kills</th>
              <th>Points</th>
            </motion.tr>
          </thead>
          <tbody>
            {teams.map((team, index) => {
              const rank = index + 1;
              const rowClassName = rank <= 3 ? `leaderboard-row leaderboard-row--top-${rank}` : "leaderboard-row";

              return (
                <motion.tr key={team.id || team.name} className={rowClassName} {...getRowMotion(index)}>
                  <td><RankDisplay rank={rank} /></td>
                  <td><TeamIdentity name={team.name} /></td>
                  <td>{team.kills}</td>
                  <td>{team.points}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>
    </PageWrapper>
  );
}

export default Leaderboard;
