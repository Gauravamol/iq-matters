import React, { useEffect, useMemo, useState } from "react";
import { Crosshair, Flame, ShieldCheck, Swords, Trophy, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import TeamIdentity from "../components/TeamIdentity";
import { apiRequest } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

function formatAverage(value) {
  return Number(value || 0).toFixed(2);
}

function PlayerIdentity({ player }) {
  return <TeamIdentity name={player.player_name} logoUrl={player.logo_url} subtitle={player.team_name} />;
}

function Stats() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(searchParams.get("tournament") || "");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const tournamentFromQuery = searchParams.get("tournament") || "";
    setSelectedTournamentId(tournamentFromQuery);
  }, [searchParams]);

  useEffect(() => {
    apiRequest("/tournaments", { token }).then((data) => {
      setTournaments(data || []);
    }).catch(() => {
      setTournaments([]);
    });
  }, [token]);

  useEffect(() => {
    loadStats(selectedTournamentId);
  }, [selectedTournamentId, token]);

  async function loadStats(tournamentId) {
    setError("");

    try {
      const query = tournamentId ? `?tournament_id=${tournamentId}` : "";
      const data = await apiRequest(`/stats${query}`, { token });
      setStats(data || null);
    } catch (requestError) {
      setStats(null);
      setError(requestError.message);
    }
  }

  const summaryCards = useMemo(() => {
    const summary = stats?.summary || {};

    return [
      { label: "Tracked Teams", value: summary.total_teams ?? 0, icon: Users },
      { label: "Tracked Players", value: summary.total_players ?? 0, icon: ShieldCheck },
      { label: "Matches Logged", value: summary.total_matches ?? 0, icon: Swords },
      { label: "Kills Recorded", value: summary.total_kills ?? 0, icon: Crosshair }
    ];
  }, [stats]);

  const topTeam = stats?.topTeams?.[0] || null;
  const topFragger = stats?.topFraggers?.[0] || null;

  function handleTournamentChange(nextTournamentId) {
    setSelectedTournamentId(nextTournamentId);

    if (nextTournamentId) {
      setSearchParams({ tournament: nextTournamentId });
      return;
    }

    setSearchParams({});
  }

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="leaderboard"
        eyebrow="Stats Center"
        title={stats?.tournament?.name ? `${stats.tournament.name} Stats` : "Tournament Stats"}
        description="Track team standings, player killboards, top fraggers, and match-driven performance from one competitive analytics surface."
      />

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Stats Scope</span>
            <h2>Killboard and Team Analytics</h2>
          </div>
          <div className="toolbar-row">
            <select className="form-input toolbar-select" value={selectedTournamentId} onChange={(event) => handleTournamentChange(event.target.value)}>
              <option value="">All tournaments</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
              ))}
            </select>
          </div>
        </div>
        {error ? <div className="form-message form-message--error">{error}</div> : null}
        <div className="stats-grid">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <article key={label} className="page-card stat-card">
              <div className="card-heading-row">
                <span className="eyebrow">{label}</span>
                <Icon className="card-icon" size={20} />
              </div>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="entity-grid">
        <article className="page-card entity-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Top Team</span>
              <h3>Current Leader</h3>
            </div>
            <Trophy className="card-icon" size={24} />
          </div>
          {topTeam ? (
            <>
              <TeamIdentity name={topTeam.name} logoUrl={topTeam.logo_url} subtitle={`${topTeam.player_count} players`} />
              <p>Points: {topTeam.points}</p>
              <p>Kills: {topTeam.kills}</p>
              <p>Matches: {topTeam.matches_played}</p>
            </>
          ) : (
            <p>No team performance data available yet.</p>
          )}
        </article>

        <article className="page-card entity-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Top Fragger</span>
              <h3>Killboard Leader</h3>
            </div>
            <Flame className="card-icon" size={24} />
          </div>
          {topFragger ? (
            <>
              <PlayerIdentity player={topFragger} />
              <p>Total kills: {topFragger.kills}</p>
              <p>Average kills: {formatAverage(topFragger.average_kills)}</p>
              <p>Best match: {topFragger.best_match_kills}</p>
            </>
          ) : (
            <p>No player kill data has been entered yet.</p>
          )}
        </article>
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Team Standings</span>
            <h3>Points Table</h3>
          </div>
          <p>Points remain automatically driven by submitted results and your configured point system.</p>
        </div>
        {stats?.teamStats?.length ? (
          <div className="table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Players</th>
                  <th>Matches</th>
                  <th>Kills</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {stats.teamStats.map((team) => (
                  <tr key={team.id} className="leaderboard-row">
                    <td><TeamIdentity name={team.name} logoUrl={team.logo_url} /></td>
                    <td>{team.player_count}</td>
                    <td>{team.matches_played}</td>
                    <td>{team.kills}</td>
                    <td>{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No team stats available yet.</p>
        )}
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Player Killboard</span>
            <h3>Top Fraggers</h3>
          </div>
          <p>Player standings are built from the per-match kill breakdown captured during result entry.</p>
        </div>
        {stats?.playerStats?.length ? (
          <div className="table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Matches</th>
                  <th>Kills</th>
                  <th>Avg Kills</th>
                  <th>Best Match</th>
                </tr>
              </thead>
              <tbody>
                {stats.playerStats.map((player) => (
                  <tr key={player.id} className="leaderboard-row">
                    <td><PlayerIdentity player={player} /></td>
                    <td>{player.matches_played}</td>
                    <td>{player.kills}</td>
                    <td>{formatAverage(player.average_kills)}</td>
                    <td>{player.best_match_kills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No player stats available yet.</p>
        )}
      </section>
    </PageWrapper>
  );
}

export default Stats;
