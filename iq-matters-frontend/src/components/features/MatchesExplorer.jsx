import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import Panel from "../ui/Panel";
import Badge from "../ui/Badge";

export default function MatchesExplorer({ compact = false }) {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTournaments();
  }, [token]);

  useEffect(() => {
    if (!selectedTournamentId) {
      return;
    }

    loadMatches(selectedTournamentId);
  }, [selectedTournamentId, token]);

  async function loadTournaments() {
    setLoading(true);

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

  async function loadMatches(tournamentId) {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/matches/${tournamentId}`, { token });
      setMatches(data || []);
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
          <span className="eyebrow">MATCH OPS</span>
          <h2>Match command board</h2>
          <p>Review maps, schedules, and assigned squads from a polished operations timeline.</p>
        </div>
      ) : null}

      <Panel glow="cyan" className="stack-md">
        <div className="row-between wrap-gap">
          <div>
            <h3>Match timeline</h3>
            <p>Switch active tournaments to see the match calendar and assignment load.</p>
          </div>

          <select className="dashboard-select" value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)}>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
            ))}
          </select>
        </div>

        {error ? <div className="banner banner--error">{error}</div> : null}
        {loading ? <div className="empty-state">Loading matches...</div> : null}

        <div className="responsive-grid responsive-grid--cards">
          {matches.map((match) => (
            <Panel key={match.id} glow={match.status === "completed" ? "green" : "cyan"} className="match-card">
              <div className="row-between">
                <Badge tone={match.status === "completed" ? "success" : "warning"}>{match.status}</Badge>
                <span className="match-card__meta">Assigned teams: {match.assigned_teams}</span>
              </div>
              <h3>Match {match.match_number}</h3>
              <p>{match.map_name}</p>
              <div className="match-card__meta">
                <span>{match.scheduled_at ? new Date(match.scheduled_at).toLocaleString() : "Schedule pending"}</span>
              </div>
            </Panel>
          ))}
        </div>
      </Panel>
    </div>
  );
}
