import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import Panel from "../ui/Panel";
import Badge from "../ui/Badge";

export default function LeaderboardBoard({ compact = false }) {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
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
    if (!selectedTournamentId) {
      return;
    }

    loadLeaderboard(selectedTournamentId);
  }, [selectedTournamentId, token]);

  async function loadTournaments() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/tournaments", { token });
      setTournaments(data || []);

      if (data?.length) {
        setSelectedTournamentId(String(data[0].id));
      }
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  }

  async function loadLeaderboard(tournamentId) {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/leaderboard/${tournamentId}`, { token });
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
          <h2>Animated leaderboard</h2>
          <p>Switch tournaments and watch the live standings pulse with every reported result.</p>
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
            <p>Placement points from the admin-configured scoring table plus one point per kill.</p>
          </div>

          <select className="dashboard-select" value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)}>
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
              <span>Kills</span>
              <span>Points</span>
            </div>

            {leaderboard.length ? leaderboard.map((team, index) => (
              <motion.div key={`${team.id}-${team.name}`} className="leaderboard-table__row" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: index * 0.03 }}>
                <span>
                  <Badge tone={index === 0 ? "success" : index === 1 ? "warning" : "neutral"}>#{index + 1}</Badge>
                </span>
                <strong>{team.name}</strong>
                <span>{team.kills}</span>
                <span>{team.points}</span>
              </motion.div>
            )) : <div className="empty-state">No results submitted yet.</div>}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
