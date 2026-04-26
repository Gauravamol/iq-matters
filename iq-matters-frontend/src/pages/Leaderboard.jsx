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

function normalizeNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function Leaderboard() {
  const { token } = useAuth();
  const { isFeatureEnabled } = usePlatform();
  const [tournaments, setTournaments] = useState([]);
  const [selectedScope, setSelectedScope] = useState("global");
  const [teams, setTeams] = useState([]);
  const [settings, setSettings] = useState({ bg_image: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/tournaments", { token })
      .then((data) => setTournaments(data || []))
      .catch((requestError) => setError(requestError.message));

    apiRequest("/leaderboard-settings")
      .then((data) => setSettings(data || { bg_image: "" }))
      .catch(() => setSettings({ bg_image: "" }));
  }, [token]);

  useEffect(() => {
    const endpoint = selectedScope === "global"
      ? "/leaderboard"
      : `/leaderboard/${selectedScope}`;

    apiRequest(endpoint, { token })
      .then((data) => {
        setTeams(data || []);
        setError("");
      })
      .catch((requestError) => setError(requestError.message));
  }, [selectedScope, token]);

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
        description="Switch between global and tournament standings to compare match volume, kills, and points by scope."
      />

      <motion.section className="page-card" {...cardMotionProps}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Standings Control</span>
            <h2>Global & Tournament Rankings</h2>
          </div>
          <p>Select Global Leaderboard for all-time totals, or a tournament to view scoped standings.</p>
        </div>
        <select className="form-input" value={selectedScope} onChange={(event) => setSelectedScope(event.target.value)}>
          <option value="global">Global Leaderboard</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
          ))}
        </select>
        {error ? <div className="form-message form-message--error">{error}</div> : null}
      </motion.section>

      <motion.div className="page-card leaderboard-surface" style={tableStyle} {...cardMotionProps} transition={{ duration: 0.3, ease: "easeOut", delay: 0.06 }}>
        <table className="leaderboard-table">
          <thead>
            <motion.tr initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: "easeOut" }}>
              <th>Rank</th>
              <th>Team</th>
              <th>Matches</th>
              <th>Kills</th>
              <th>Points</th>
            </motion.tr>
          </thead>
          <tbody>
            {teams.map((team, index) => {
              const rank = index + 1;
              const rowClassName = rank <= 3 ? `leaderboard-row leaderboard-row--top-${rank}` : "leaderboard-row";
              const matchesPlayed = normalizeNumber(team.matches_played);
              const kills = normalizeNumber(team.kills ?? team.total_kills);
              const points = normalizeNumber(team.points ?? team.total_points);

              return (
                <motion.tr key={team.id || team.name} className={rowClassName} {...getRowMotion(index)}>
                  <td><RankDisplay rank={rank} /></td>
                  <td><TeamIdentity name={team.name} logoUrl={team.logo_url} /></td>
                  <td>{matchesPlayed}</td>
                  <td>{kills}</td>
                  <td>{points}</td>
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
