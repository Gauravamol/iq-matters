import React, { useEffect, useMemo, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import AdminPanelNav from "../components/AdminPanelNav";
import ActionButton from "../components/ActionButton";
import TeamIdentity from "../components/TeamIdentity";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const emptyForm = {
  id: null,
  tournament_id: "",
  match_id: "",
  team_id: "",
  position: "",
  kills: "",
  report_notes: "",
  player_stats: []
};

function syncPlayerStats(players, existingStats = []) {
  const statsByPlayerId = new Map(
    (existingStats || []).map((stat) => [String(stat.player_id), String(stat.kills ?? "0")])
  );

  return (players || []).map((player) => ({
    player_id: String(player.id),
    player_name: player.player_name,
    player_uid: player.player_uid,
    logo_url: player.logo_url,
    kills: statsByPlayerId.get(String(player.id)) || "0"
  }));
}

function AdminResults() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [results, setResults] = useState([]);
  const [matchOptions, setMatchOptions] = useState(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    try {
      const [tournamentData, matchData, resultData] = await Promise.all([
        apiRequest("/admin/tournaments", { token }),
        apiRequest("/admin/matches", { token }),
        apiRequest("/admin/results", { token })
      ]);

      setTournaments(tournamentData || []);
      setMatches(matchData || []);
      setResults(resultData || []);
      setForm((current) => ({ ...current, tournament_id: current.tournament_id || String(tournamentData?.[0]?.id || "") }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadMatchOptions(matchId) {
    if (!matchId) {
      setMatchOptions(null);
      return;
    }

    try {
      const data = await apiRequest(`/admin/matches/${matchId}/assignments`, { token });
      setMatchOptions(data || null);
      setForm((current) => {
        const eligibleTeams = (data?.assignedTeams?.length ? data.assignedTeams : data?.availableTeams) || [];
        const selectedTeam = eligibleTeams.find((team) => String(team.id) === String(current.team_id));

        return {
          ...current,
          team_id: selectedTeam ? current.team_id : "",
          player_stats: selectedTeam ? syncPlayerStats(selectedTeam.players, current.player_stats) : []
        };
      });
    } catch (requestError) {
      setMatchOptions(null);
      setError(requestError.message);
    }
  }

  useEffect(() => {
    if (!form.match_id) {
      setMatchOptions(null);
      setTeamSearch("");
      return;
    }

    loadMatchOptions(form.match_id);
  }, [form.match_id, token]);

  const filteredMatches = useMemo(() => matches.filter((match) => String(match.tournament_id) === String(form.tournament_id)), [matches, form.tournament_id]);
  const eligibleTeams = useMemo(() => {
    if (!matchOptions) {
      return [];
    }

    return matchOptions.assignedTeams?.length ? matchOptions.assignedTeams : (matchOptions.availableTeams || []);
  }, [matchOptions]);
  const filteredTeams = useMemo(() => {
    const searchTerm = teamSearch.trim().toLowerCase();

    if (!searchTerm) {
      return eligibleTeams;
    }

    return eligibleTeams.filter((team) => {
      const rosterText = (team.players || [])
        .map((player) => `${player.player_name} ${player.player_uid}`)
        .join(" ")
        .toLowerCase();

      return String(team.name || "").toLowerCase().includes(searchTerm) || rosterText.includes(searchTerm);
    });
  }, [eligibleTeams, teamSearch]);
  const selectedTeam = eligibleTeams.find((team) => String(team.id) === String(form.team_id));

  function resetForm() {
    setForm({ ...emptyForm, tournament_id: String(tournaments[0]?.id || "") });
    setTeamSearch("");
  }

  async function startEdit(result) {
    setMessage("");
    setError("");

    try {
      const detail = await apiRequest(`/admin/results/${result.id}`, { token });
      setForm({
        id: detail.id,
        tournament_id: String(detail.tournament_id),
        match_id: String(detail.match_id),
        team_id: String(detail.team_id),
        position: String(detail.position),
        kills: String(detail.kills),
        report_notes: detail.report_notes || "",
        player_stats: (detail.player_stats || []).map((stat) => ({
          ...stat,
          player_id: String(stat.player_id),
          kills: String(stat.kills)
        }))
      });
      setTeamSearch(detail.team_name || "");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function selectTeam(teamId) {
    const team = eligibleTeams.find((row) => String(row.id) === String(teamId));

    setForm((current) => ({
      ...current,
      team_id: String(teamId || ""),
      player_stats: team ? syncPlayerStats(team.players, current.player_stats) : []
    }));
  }

  function updatePlayerKills(playerId, kills) {
    setForm((current) => ({
      ...current,
      player_stats: current.player_stats.map((player) => (
        String(player.player_id) === String(playerId)
          ? { ...player, kills }
          : player
      ))
    }));
  }

  async function saveResult(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const playerStats = form.player_stats.map((player) => ({
      player_id: Number(player.player_id),
      kills: Number(player.kills || 0)
    }));
    const totalKills = playerStats.reduce((total, player) => total + (Number(player.kills) || 0), 0);

    const payload = {
      tournament_id: Number(form.tournament_id),
      match_id: Number(form.match_id),
      team_id: Number(form.team_id),
      position: Number(form.position),
      kills: totalKills,
      report_notes: form.report_notes,
      player_stats: playerStats
    };

    try {
      if (form.id) {
        await apiRequest(`/admin/results/${form.id}`, {
          method: "PUT",
          token,
          body: payload
        });
        setMessage("Result updated.");
      } else {
        await apiRequest("/admin/results", {
          method: "POST",
          token,
          body: payload
        });
        setMessage("Result created.");
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeResult(id) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/admin/results/${id}`, {
        method: "DELETE",
        token
      });
      setMessage("Result deleted.");
      if (form.id === id) {
        resetForm();
      }
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="leaderboard"
        eyebrow="Admin Results"
        title="Manage Results"
        description="Create, correct, and delete results while automatically keeping the leaderboard and team totals in sync."
      />

      <AdminPanelNav />

      <section className="page-card page-card--form">
        <div className="section-head">
          <div>
            <span className="eyebrow">Result Form</span>
            <h2>{form.id ? "Edit Result" : "Create Result"}</h2>
          </div>
          {form.id ? <ActionButton iconName="action" className="nav-button nav-button--ghost" onClick={resetForm}>Cancel Edit</ActionButton> : null}
        </div>
        <form className="form-stack" onSubmit={saveResult}>
          <select className="form-input" value={form.tournament_id} onChange={(event) => setForm({ ...form, tournament_id: event.target.value, match_id: "" })}>
            <option value="">Select tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
            ))}
          </select>
          <select className="form-input" value={form.match_id} onChange={(event) => setForm({ ...form, match_id: event.target.value, team_id: "", player_stats: [] })}>
            <option value="">Select match</option>
            {filteredMatches.map((match) => (
              <option key={match.id} value={match.id}>Match {match.match_number} - {match.map_name}</option>
            ))}
          </select>
          <input className="form-input" placeholder="Search by team or player name" value={teamSearch} onChange={(event) => setTeamSearch(event.target.value)} />
          <select className="form-input" value={form.team_id} onChange={(event) => selectTeam(event.target.value)}>
            <option value="">Select team</option>
            {filteredTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} - {(team.players || []).map((player) => player.player_name).join(", ")}
              </option>
            ))}
          </select>
          <input className="form-input" placeholder="Position" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
          {selectedTeam ? (
            <div className="form-grid">
              {form.player_stats.map((player) => (
                <div key={player.player_id} className="page-card entity-card registration-player-card">
                  <TeamIdentity name={player.player_name} logoUrl={player.logo_url} subtitle={player.player_uid} />
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="Kills"
                    value={player.kills}
                    onChange={(event) => updatePlayerKills(player.player_id, event.target.value)}
                  />
                </div>
              ))}
            </div>
          ) : null}
          <input className="form-input" placeholder="Total kills" value={form.player_stats.reduce((total, player) => total + Number(player.kills || 0), 0)} readOnly />
          <textarea className="form-input form-textarea" placeholder="Match report or admin notes" value={form.report_notes} onChange={(event) => setForm({ ...form, report_notes: event.target.value })} />
          {message ? <div className="form-message form-message--success">{message}</div> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}
          <ActionButton iconName="results" type="submit">{form.id ? "Save Result" : "Create Result"}</ActionButton>
        </form>
      </section>

      <section className="entity-grid">
        {results.map((result) => (
          <article key={result.id} className="page-card entity-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">{result.tournament_name}</span>
                <h3>{result.team_name}</h3>
              </div>
              <span className="entity-meta">Result #{result.id}</span>
            </div>
            <p>Match {result.match_number} - {result.map_name}</p>
            <p>Placement: {result.position}</p>
            <p>Kills: {result.kills}</p>
            <p>Points: {result.points}</p>
            {result.report_notes ? <p>Report: {result.report_notes}</p> : null}
            <div className="button-row">
              <ActionButton iconName="settings" className="nav-button nav-button--ghost" onClick={() => startEdit(result)}>Edit</ActionButton>
              <ActionButton iconName="results" className="nav-button nav-button--ghost" onClick={() => removeResult(result.id)}>Delete</ActionButton>
            </div>
          </article>
        ))}
      </section>
    </PageWrapper>
  );
}

export default AdminResults;
