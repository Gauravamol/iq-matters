import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import Panel from "../ui/Panel";
import Badge from "../ui/Badge";

function normalizeNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function LeaderboardBoard({ compact = false }) {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedScope, setSelectedScope] = useState("global");
  const [leaderboard, setLeaderboard] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTournaments();
    apiRequest("/leaderboard-settings", { token }).then(setSettings).catch(() => {
      setSettings(null);
    });
  }, [token]);

  useEffect(() => {
    loadLeaderboard(selectedScope);
  }, [selectedScope, token]);

  async function loadTournaments() {
    try {
      const data = await apiRequest("/tournaments", { token });
      setTournaments(data || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadLeaderboard(scope) {
    setLoading(true);
    setError("");

    try {
      const endpoint = scope === "global" ? "/leaderboard" : `/leaderboard/${scope}`;
      const data = await apiRequest(endpoint, { token });
      setLeaderboard(data || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack-lg">
      {!compact ? (
        <div className="section-copy">
          <span className="eyebrow">POWER RANKINGS</span>
          <h2>Scoped leaderboard</h2>
          <p>Switch between global and tournament standings to compare team performance by scope.</p>
        </div>
      ) : null}

      <Panel
        glow="green"
        className="leaderboard-shell"
        style={settings?.bg_image ? { backgroundImage: `linear-gradient(180deg, rgba(7,11,20,0.86), rgba(7,11,20,0.98)), url(${settings.bg_image})` } : undefined}
      >
        <div className="row-between wrap-gap">
          <div>
            <h3>Leaderboard feed</h3>
            <p>Review global totals or drill into one tournament leaderboard.</p>
          </div>

          <select className="dashboard-select" value={selectedScope} onChange={(event) => setSelectedScope(event.target.value)}>
            <option value="global">Global Leaderboard</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
            ))}
          </select>
        </div>

        {error ? <div className="banner banner--error">{error}</div> : null}
        {loading ? <div className="empty-state">Syncing leaderboard...</div> : null}

        {!loading ? (
          <div className="leaderboard-table">
            <div className="leaderboard-table__head">
              <span>Rank</span>
              <span>Team</span>
              <span>Matches</span>
              <span>Kills</span>
              <span>Points</span>
            </div>

            {leaderboard.length ? leaderboard.map((team, index) => (
              <motion.div key={`${team.id}-${team.name}`} className="leaderboard-table__row" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: index * 0.03 }}>
                <span>
                  <Badge tone={index === 0 ? "success" : index === 1 ? "warning" : "neutral"}>#{index + 1}</Badge>
                </span>
                <strong>{team.name}</strong>
                <span>{normalizeNumber(team.matches_played)}</span>
                <span>{normalizeNumber(team.kills ?? team.total_kills)}</span>
                <span>{normalizeNumber(team.points ?? team.total_points)}</span>
              </motion.div>
            )) : <div className="empty-state">No results submitted yet.</div>}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
