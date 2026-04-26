import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Gamepad2, MapPinned } from "lucide-react";
import PageWrapper, { cardMotionProps } from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

function MatchBadge({ icon: Icon, text }) {
  return (
    <span className="metric-pill metric-pill--compact">
      <Icon size={15} />
      <span>{text}</span>
    </span>
  );
}

function Matches() {
  const { token, joinedTournamentIds } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [matches, setMatches] = useState([]);
  const [resultRows, setResultRows] = useState([]);
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
  }, [token, joinedTournamentIds]);

  useEffect(() => {
    if (!selectedTournamentId) {
      return;
    }

    Promise.all([
      apiRequest(`/matches/${selectedTournamentId}`, { token }),
      apiRequest(`/matches/${selectedTournamentId}/results`, { token })
    ])
      .then(([matchData, rows]) => {
        setMatches(matchData || []);
        setResultRows(rows || []);
        setError("");
      })
      .catch((requestError) => setError(requestError.message));
  }, [selectedTournamentId, token]);

  const selectedTournament = tournaments.find((tournament) => String(tournament.id) === selectedTournamentId);

  const resultRowsByMatchId = useMemo(() => {
    const grouped = new Map();

    for (const row of resultRows) {
      const key = Number(row.match_id);

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      grouped.get(key).push(row);
    }

    return grouped;
  }, [resultRows]);

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="matches"
        eyebrow="Match Control"
        title="Matches"
        description="View match-wise standings with placement, kills, and points for each tournament lobby."
      />

      <motion.section className="page-card" {...cardMotionProps}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Match Board</span>
            <h2>Current Matches</h2>
          </div>
          <p>{selectedTournament ? `Showing matches for ${selectedTournament.name}.` : "Select a tournament to view matches."}</p>
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

      <div className="stats-grid">
        {matches.map((match, index) => {
          const leaderboardRows = resultRowsByMatchId.get(Number(match.id)) || [];

          return (
            <motion.article
              key={match.id}
              className="page-card match-card"
              {...cardMotionProps}
              transition={{ ...cardMotionProps.transition, delay: Math.min(index * 0.04, 0.2) }}
            >
              <div className="card-heading-row">
                <div>
                  <span className="eyebrow">Match {match.match_number}</span>
                  <h3>{selectedTournament?.name || "Tournament Match"}</h3>
                </div>
                <Gamepad2 className="card-icon" size={24} />
              </div>
              <div className="metric-row">
                <MatchBadge icon={MapPinned} text={match.map_name || "Map TBA"} />
                <MatchBadge icon={CalendarDays} text={match.status || "pending"} />
              </div>

              {leaderboardRows.length ? (
                <ol className="data-list">
                  {leaderboardRows.map((row) => (
                    <li key={row.id}>
                      <span>{row.team_name} - Position {row.position} - {row.kills} kills</span>
                      <strong>{row.points} pts</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No results submitted for this match yet.</p>
              )}
            </motion.article>
          );
        })}
      </div>
    </PageWrapper>
  );
}

export default Matches;
