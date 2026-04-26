import React, { useEffect, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import AdminPanelNav from "../components/AdminPanelNav";
import ActionButton from "../components/ActionButton";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const emptyForm = {
  id: null,
  tournament_id: "",
  match_number: "",
  map_name: "",
  scheduled_at: "",
  status: "pending"
};

function formatDateForApi(value) {
  if (!value) {
    return null;
  }

  return `${value.replace("T", " ")}:00`;
}

function formatDateForInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function AdminMatches() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [assignmentState, setAssignmentState] = useState(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [token]);

  useEffect(() => {
    if (!selectedMatchId) {
      setAssignmentState(null);
      setSelectedTeamIds([]);
      setAssignmentError("");
      return;
    }

    loadAssignments(selectedMatchId);
  }, [selectedMatchId, token]);

  async function loadData() {
    setError("");

    try {
      const [tournamentData, matchData] = await Promise.all([
        apiRequest("/admin/tournaments", { token }),
        apiRequest("/admin/matches", { token })
      ]);

      const nextTournaments = tournamentData || [];
      const nextMatches = matchData || [];

      setTournaments(nextTournaments);
      setMatches(nextMatches);
      setForm((current) => ({ ...current, tournament_id: current.tournament_id || String(nextTournaments?.[0]?.id || "") }));
      setSelectedMatchId((current) => {
        const currentId = String(current || "");

        if (currentId && nextMatches.some((match) => String(match.id) === currentId)) {
          return currentId;
        }

        return String(nextMatches?.[0]?.id || "");
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadAssignments(matchId) {
    setAssignmentLoading(true);
    setAssignmentError("");

    try {
      const data = await apiRequest(`/admin/matches/${matchId}/assignments`, { token });
      setAssignmentState(data);
      setSelectedTeamIds((data?.assignedTeams || []).map((team) => Number(team.id)));
    } catch (requestError) {
      setAssignmentState(null);
      setSelectedTeamIds([]);
      setAssignmentError(requestError.message);
    } finally {
      setAssignmentLoading(false);
    }
  }

  function resetForm() {
    setForm({ ...emptyForm, tournament_id: String(tournaments[0]?.id || "") });
  }

  function startEdit(match) {
    setForm({
      id: match.id,
      tournament_id: String(match.tournament_id),
      match_number: String(match.match_number),
      map_name: match.map_name,
      scheduled_at: formatDateForInput(match.scheduled_at),
      status: match.status || "pending"
    });
    setSelectedMatchId(String(match.id));
    setMessage("");
    setError("");
  }

  function toggleAssignedTeam(teamId) {
    const normalizedTeamId = Number(teamId);

    setSelectedTeamIds((current) => (
      current.includes(normalizedTeamId)
        ? current.filter((id) => id !== normalizedTeamId)
        : [...current, normalizedTeamId]
    ));
  }

  async function saveMatch(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const payload = {
      tournament_id: Number(form.tournament_id),
      match_number: Number(form.match_number),
      map_name: form.map_name,
      scheduled_at: formatDateForApi(form.scheduled_at),
      status: form.status
    };

    try {
      if (form.id) {
        await apiRequest(`/admin/matches/${form.id}`, {
          method: "PUT",
          token,
          body: payload
        });
        setMessage("Match updated.");
      } else {
        await apiRequest("/admin/matches", {
          method: "POST",
          token,
          body: payload
        });
        setMessage("Match created.");
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeMatch(id) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/admin/matches/${id}`, {
        method: "DELETE",
        token
      });
      setMessage("Match deleted.");
      if (form.id === id) {
        resetForm();
      }
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveAssignments(event) {
    event.preventDefault();
    setAssignmentMessage("");
    setAssignmentError("");

    if (!selectedMatchId) {
      setAssignmentError("Select a match to update assignments.");
      return;
    }

    try {
      await apiRequest(`/admin/matches/${selectedMatchId}/assignments`, {
        method: "POST",
        token,
        body: {
          team_ids: selectedTeamIds
        }
      });
      setAssignmentMessage("Match assignments updated.");
      await loadData();
      await loadAssignments(selectedMatchId);
    } catch (requestError) {
      setAssignmentError(requestError.message);
    }
  }

  const selectedMatch = matches.find((match) => String(match.id) === String(selectedMatchId));

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="matches"
        eyebrow="Admin Matches"
        title="Manage Matches"
        description="Create, edit, and delete matches while keeping schedules and result dependencies consistent."
      />

      <AdminPanelNav />

      <section className="page-card page-card--form">
        <div className="section-head">
          <div>
            <span className="eyebrow">Match Form</span>
            <h2>{form.id ? "Edit Match" : "Create Match"}</h2>
          </div>
          {form.id ? <ActionButton iconName="action" className="nav-button nav-button--ghost" onClick={resetForm}>Cancel Edit</ActionButton> : null}
        </div>
        <form className="form-stack" onSubmit={saveMatch}>
          <select className="form-input" value={form.tournament_id} onChange={(event) => setForm({ ...form, tournament_id: event.target.value })}>
            <option value="">Select tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
            ))}
          </select>
          <input className="form-input" placeholder="Match number" value={form.match_number} onChange={(event) => setForm({ ...form, match_number: event.target.value })} />
          <input className="form-input" placeholder="Map name" value={form.map_name} onChange={(event) => setForm({ ...form, map_name: event.target.value })} />
          <input className="form-input" type="datetime-local" value={form.scheduled_at} onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })} />
          <select className="form-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          {message ? <div className="form-message form-message--success">{message}</div> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}
          <ActionButton iconName="matches" type="submit">{form.id ? "Save Match" : "Create Match"}</ActionButton>
        </form>
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Match Assignment Desk</span>
            <h2>Assign Tournament Teams</h2>
          </div>
          <div className="toolbar-row">
            <select className="form-input toolbar-select" value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)}>
              <option value="">Select match</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.tournament_name} - Match {match.match_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedMatch ? (
          <div className="metric-row">
            <div className="metric-pill">
              <span>Tournament: {selectedMatch.tournament_name}</span>
            </div>
            <div className="metric-pill">
              <span>Assigned: {selectedTeamIds.length}</span>
            </div>
            <div className="metric-pill">
              <span>Results: {selectedMatch.result_count}</span>
            </div>
          </div>
        ) : (
          <p>Select a match to assign registered teams.</p>
        )}

        {assignmentMessage ? <div className="form-message form-message--success">{assignmentMessage}</div> : null}
        {assignmentError ? <div className="form-message form-message--error">{assignmentError}</div> : null}
        {assignmentLoading ? <p>Loading eligible teams...</p> : null}

        {!assignmentLoading && selectedMatch ? (
          assignmentState?.availableTeams?.length ? (
            <form className="stack-layout" onSubmit={saveAssignments}>
              <div className="table-wrap">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Status</th>
                      <th>Assign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentState.availableTeams.map((team) => {
                      const isAssigned = selectedTeamIds.includes(Number(team.id));

                      return (
                        <tr key={team.id} className="leaderboard-row">
                          <td>{team.name}</td>
                          <td>{isAssigned ? "Assigned" : "Available"}</td>
                          <td>
                            <input type="checkbox" checked={isAssigned} onChange={() => toggleAssignedTeam(team.id)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="button-row">
                <ActionButton iconName="teams" type="submit">Save Assignments</ActionButton>
              </div>
            </form>
          ) : (
            <p>No registered teams are available for this match yet.</p>
          )
        ) : null}
      </section>

      <section className="entity-grid">
        {matches.map((match) => (
          <article key={match.id} className="page-card entity-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">{match.status}</span>
                <h3>{match.tournament_name}</h3>
              </div>
              <span className="entity-meta">Match #{match.match_number}</span>
            </div>
            <p>Map: {match.map_name}</p>
            <p>Scheduled: {match.scheduled_at ? new Date(match.scheduled_at).toLocaleString() : "Not scheduled"}</p>
            <p>Assigned teams: {match.assigned_teams}</p>
            <p>Results: {match.result_count}</p>
            <div className="button-row">
              <ActionButton iconName="teams" className="nav-button nav-button--ghost" onClick={() => setSelectedMatchId(String(match.id))}>Manage Teams</ActionButton>
              <ActionButton iconName="settings" className="nav-button nav-button--ghost" onClick={() => startEdit(match)}>Edit</ActionButton>
              <ActionButton iconName="matches" className="nav-button nav-button--ghost" onClick={() => removeMatch(match.id)}>Delete</ActionButton>
            </div>
          </article>
        ))}
      </section>
    </PageWrapper>
  );
}

export default AdminMatches;
