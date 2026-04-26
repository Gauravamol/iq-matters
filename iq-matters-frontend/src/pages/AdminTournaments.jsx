import React, { useEffect, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import AdminPanelNav from "../components/AdminPanelNav";
import ActionButton from "../components/ActionButton";
import TeamIdentity from "../components/TeamIdentity";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const defaultPointsSystem = [
  { position: "1", points: "15" },
  { position: "2", points: "12" },
  { position: "3", points: "10" },
  { position: "4", points: "8" },
  { position: "5", points: "6" },
  { position: "6", points: "4" },
  { position: "7", points: "2" },
  { position: "8", points: "1" }
];

function createEmptyForm() {
  return {
    id: null,
    name: "",
    date: "",
    entry_fee: "",
    prize_pool: "",
    max_teams: "",
    min_players: "1",
    max_players_per_team: "4",
    status: "upcoming",
    show_contact_email_field: true,
    show_contact_discord_field: false,
    show_contact_phone_field: false,
    allow_team_logo: true,
    allow_player_logo: true,
    require_admin_approval: true,
    points_system: defaultPointsSystem.map((rule) => ({ ...rule }))
  };
}

function toEditablePointsSystem(pointsSystem) {
  if (!Array.isArray(pointsSystem) || !pointsSystem.length) {
    return defaultPointsSystem.map((rule) => ({ ...rule }));
  }

  return pointsSystem.map((rule) => ({
    position: String(rule.position ?? ""),
    points: String(rule.points ?? "")
  }));
}

function buildPointsPayload(pointsSystem) {
  const normalizedRules = (pointsSystem || [])
    .map((rule) => ({
      position: Number(rule.position),
      points: Number(rule.points)
    }))
    .filter((rule) => Number.isFinite(rule.position) && rule.position > 0 && Number.isFinite(rule.points) && rule.points >= 0)
    .sort((left, right) => left.position - right.position);

  if (!normalizedRules.length) {
    throw new Error("Add at least one valid points rule before saving.");
  }

  return normalizedRules;
}

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

function formatTournamentDate(value) {
  if (!value) {
    return "Not scheduled";
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? "Not scheduled" : parsedDate.toLocaleString();
}

function formatRequestStatus(status) {
  if (status === "approved") {
    return "Approved";
  }

  if (status === "declined") {
    return "Declined";
  }

  return "Pending";
}

function AdminTournaments() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadTournaments();
  }, [token]);

  useEffect(() => {
    if (!selectedTournamentId) {
      setRegistrations([]);
      setRequests([]);
      setRegistrationError("");
      setRequestError("");
      return;
    }

    loadRegistrationBoard(selectedTournamentId);
    loadRequestBoard(selectedTournamentId);
  }, [selectedTournamentId, token]);

  async function loadTournaments() {
    setError("");

    try {
      const data = await apiRequest("/admin/tournaments", { token });
      const nextTournaments = data || [];
      setTournaments(nextTournaments);
      setSelectedTournamentId((current) => {
        const currentId = String(current || "");

        if (currentId && nextTournaments.some((tournament) => String(tournament.id) === currentId)) {
          return currentId;
        }

        return String(nextTournaments[0]?.id || "");
      });
    } catch (requestErrorValue) {
      setError(requestErrorValue.message);
    }
  }

  async function loadRegistrationBoard(tournamentId) {
    setRegistrationsLoading(true);
    setRegistrationError("");

    try {
      const data = await apiRequest(`/admin/tournaments/${tournamentId}/registrations`, { token });
      setRegistrations(data || []);
    } catch (requestErrorValue) {
      setRegistrations([]);
      setRegistrationError(requestErrorValue.message);
    } finally {
      setRegistrationsLoading(false);
    }
  }

  async function loadRequestBoard(tournamentId) {
    setRequestsLoading(true);
    setRequestError("");

    try {
      const data = await apiRequest(`/admin/tournaments/${tournamentId}/requests`, { token });
      setRequests(data || []);
    } catch (requestErrorValue) {
      setRequests([]);
      setRequestError(requestErrorValue.message);
    } finally {
      setRequestsLoading(false);
    }
  }

  function resetForm() {
    setForm(createEmptyForm());
  }

  function startEdit(tournament) {
    setForm({
      id: tournament.id,
      name: tournament.name || "",
      date: formatDateForInput(tournament.date),
      entry_fee: String(tournament.entry_fee || 0),
      prize_pool: String(tournament.prize_pool || 0),
      max_teams: String(tournament.max_teams || 0),
      min_players: String(tournament.min_players || 1),
      max_players_per_team: String(tournament.max_players_per_team || 4),
      status: tournament.status || "upcoming",
      show_contact_email_field: Boolean(tournament.show_contact_email_field),
      show_contact_discord_field: Boolean(tournament.show_contact_discord_field),
      show_contact_phone_field: Boolean(tournament.show_contact_phone_field),
      allow_team_logo: Boolean(tournament.allow_team_logo),
      allow_player_logo: Boolean(tournament.allow_player_logo),
      require_admin_approval: Boolean(tournament.require_admin_approval),
      points_system: toEditablePointsSystem(tournament.points_system)
    });
    setSelectedTournamentId(String(tournament.id));
    setMessage("");
    setError("");
  }

  function updatePointsRule(index, field, value) {
    setForm((current) => ({
      ...current,
      points_system: current.points_system.map((rule, ruleIndex) => (
        ruleIndex === index ? { ...rule, [field]: value } : rule
      ))
    }));
  }

  function addPointsRule() {
    setForm((current) => ({
      ...current,
      points_system: [
        ...current.points_system,
        {
          position: String(current.points_system.length + 1),
          points: "0"
        }
      ]
    }));
  }

  function removePointsRule(index) {
    setForm((current) => ({
      ...current,
      points_system: current.points_system.filter((_, ruleIndex) => ruleIndex !== index)
    }));
  }

  async function saveTournament(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        name: form.name,
        date: formatDateForApi(form.date),
        entry_fee: Number(form.entry_fee || 0),
        prize_pool: Number(form.prize_pool || 0),
        max_teams: Number(form.max_teams || 0),
        min_players: Number(form.min_players || 1),
        max_players_per_team: Number(form.max_players_per_team || 4),
        status: form.status,
        show_contact_email_field: Boolean(form.show_contact_email_field),
        show_contact_discord_field: Boolean(form.show_contact_discord_field),
        show_contact_phone_field: Boolean(form.show_contact_phone_field),
        allow_team_logo: Boolean(form.allow_team_logo),
        allow_player_logo: Boolean(form.allow_player_logo),
        require_admin_approval: Boolean(form.require_admin_approval),
        points_system: buildPointsPayload(form.points_system)
      };

      let response;

      if (form.id) {
        response = await apiRequest(`/admin/tournaments/${form.id}`, {
          method: "PUT",
          token,
          body: payload
        });
        setMessage("Tournament updated.");
      } else {
        response = await apiRequest("/admin/tournaments", {
          method: "POST",
          token,
          body: payload
        });
        setMessage("Tournament created.");
      }

      const savedTournamentId = String(response?.tournament?.id || form.id || "");
      resetForm();
      await loadTournaments();
      if (savedTournamentId) {
        setSelectedTournamentId(savedTournamentId);
      }
    } catch (requestErrorValue) {
      setError(requestErrorValue.message);
    }
  }

  async function removeTournament(id) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/admin/tournaments/${id}`, {
        method: "DELETE",
        token
      });
      setMessage("Tournament deleted.");
      if (form.id === id) {
        resetForm();
      }
      await loadTournaments();
    } catch (requestErrorValue) {
      setError(requestErrorValue.message);
    }
  }

  async function toggleRegistrationStatus(registration) {
    if (!selectedTournamentId) {
      return;
    }

    setMessage("");
    setRegistrationError("");

    try {
      await apiRequest(`/admin/tournaments/${selectedTournamentId}/registrations/${registration.id}`, {
        method: "PATCH",
        token,
        body: {
          disqualified: !registration.disqualified,
          disqualification_reason: !registration.disqualified ? "Disqualified by admin" : null
        }
      });
      setMessage(registration.disqualified ? "Team reinstated." : "Team disqualified.");
      await loadTournaments();
      await loadRegistrationBoard(selectedTournamentId);
    } catch (requestErrorValue) {
      setRegistrationError(requestErrorValue.message);
    }
  }

  async function removeRegistration(teamId) {
    if (!selectedTournamentId) {
      return;
    }

    setMessage("");
    setRegistrationError("");

    try {
      await apiRequest(`/admin/tournaments/${selectedTournamentId}/registrations/${teamId}`, {
        method: "DELETE",
        token
      });
      setMessage("Tournament registration removed.");
      await loadTournaments();
      await loadRegistrationBoard(selectedTournamentId);
    } catch (requestErrorValue) {
      setRegistrationError(requestErrorValue.message);
    }
  }

  async function reviewRequest(requestId, status) {
    setMessage("");
    setRequestError("");

    try {
      await apiRequest(`/admin/registration-requests/${requestId}`, {
        method: "PATCH",
        token,
        body: {
          status,
          decision_reason: status === "approved" ? "Approved by admin" : "Declined by admin"
        }
      });

      setMessage(status === "approved" ? "Registration approved." : "Registration declined.");
      await loadTournaments();
      await loadRegistrationBoard(selectedTournamentId);
      await loadRequestBoard(selectedTournamentId);
    } catch (requestErrorValue) {
      setRequestError(requestErrorValue.message);
    }
  }

  const selectedTournament = tournaments.find((tournament) => String(tournament.id) === String(selectedTournamentId));

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="tournaments"
        eyebrow="Admin Tournaments"
        title="Manage Tournaments"
        description="Create tournaments, tune the points table, configure registration forms, and approve squads from one screen."
      />

      <AdminPanelNav />

      <section className="page-card page-card--form">
        <div className="section-head">
          <div>
            <span className="eyebrow">Tournament Form</span>
            <h2>{form.id ? "Edit Tournament" : "Create Tournament"}</h2>
          </div>
          {form.id ? <ActionButton iconName="action" className="nav-button nav-button--ghost" onClick={resetForm}>Cancel Edit</ActionButton> : null}
        </div>
        <form className="form-stack" onSubmit={saveTournament}>
          <div className="form-grid">
            <input className="form-input" placeholder="Tournament name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <input className="form-input" type="datetime-local" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <input className="form-input" placeholder="Entry fee" value={form.entry_fee} onChange={(event) => setForm({ ...form, entry_fee: event.target.value })} />
            <input className="form-input" placeholder="Prize pool" value={form.prize_pool} onChange={(event) => setForm({ ...form, prize_pool: event.target.value })} />
            <input className="form-input" placeholder="Max teams" value={form.max_teams} onChange={(event) => setForm({ ...form, max_teams: event.target.value })} />
            <select className="form-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
            <input className="form-input" placeholder="Minimum players" value={form.min_players} onChange={(event) => setForm({ ...form, min_players: event.target.value })} />
            <input className="form-input" placeholder="Maximum players per team" value={form.max_players_per_team} onChange={(event) => setForm({ ...form, max_players_per_team: event.target.value })} />
          </div>

          <div className="feature-grid">
            <article className="page-card feature-card">
              <div>
                <span className="eyebrow">Registration Form</span>
                <h3>Optional Contact Fields</h3>
              </div>
              <label className="toggle-row">
                <span>Show team email</span>
                <input type="checkbox" checked={form.show_contact_email_field} onChange={(event) => setForm({ ...form, show_contact_email_field: event.target.checked })} />
              </label>
              <label className="toggle-row">
                <span>Show Discord ID</span>
                <input type="checkbox" checked={form.show_contact_discord_field} onChange={(event) => setForm({ ...form, show_contact_discord_field: event.target.checked })} />
              </label>
              <label className="toggle-row">
                <span>Show phone number</span>
                <input type="checkbox" checked={form.show_contact_phone_field} onChange={(event) => setForm({ ...form, show_contact_phone_field: event.target.checked })} />
              </label>
            </article>

            <article className="page-card feature-card">
              <div>
                <span className="eyebrow">Assets & Approval</span>
                <h3>Registration Controls</h3>
              </div>
              <label className="toggle-row">
                <span>Allow team logo</span>
                <input type="checkbox" checked={form.allow_team_logo} onChange={(event) => setForm({ ...form, allow_team_logo: event.target.checked })} />
              </label>
              <label className="toggle-row">
                <span>Allow player logo</span>
                <input type="checkbox" checked={form.allow_player_logo} onChange={(event) => setForm({ ...form, allow_player_logo: event.target.checked })} />
              </label>
              <label className="toggle-row">
                <span>Require admin approval</span>
                <input type="checkbox" checked={form.require_admin_approval} onChange={(event) => setForm({ ...form, require_admin_approval: event.target.checked })} />
              </label>
            </article>
          </div>

          <div className="section-head">
            <div>
              <span className="eyebrow">Points Table</span>
              <h3>Placement Rules</h3>
            </div>
            <p>These rules are saved on the tournament and used automatically whenever match results are entered.</p>
          </div>
          <div className="points-grid">
            {form.points_system.map((rule, index) => (
              <div key={`${rule.position}-${index}`} className="points-row">
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  placeholder="Position"
                  value={rule.position}
                  onChange={(event) => updatePointsRule(index, "position", event.target.value)}
                />
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  placeholder="Points"
                  value={rule.points}
                  onChange={(event) => updatePointsRule(index, "points", event.target.value)}
                />
                <ActionButton
                  type="button"
                  iconName="action"
                  className="nav-button nav-button--ghost"
                  onClick={() => removePointsRule(index)}
                  disabled={form.points_system.length === 1}
                >
                  Remove
                </ActionButton>
              </div>
            ))}
          </div>

          <div className="button-row">
            <ActionButton type="button" iconName="settings" className="nav-button nav-button--ghost" onClick={addPointsRule}>Add Rule</ActionButton>
            <ActionButton iconName="tournaments" type="submit">{form.id ? "Save Tournament" : "Create Tournament"}</ActionButton>
          </div>

          {message ? <div className="form-message form-message--success">{message}</div> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}
        </form>
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Registration Ops</span>
            <h2>Requests & Approvals</h2>
          </div>
          <div className="toolbar-row">
            <select className="form-input toolbar-select" value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)}>
              <option value="">Select tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
              ))}
            </select>
            {selectedTournament ? <ActionButton to={`/tournaments/${selectedTournament.id}/points-table`} iconName="stats" className="nav-button nav-button--ghost">Open Points Table</ActionButton> : null}
          </div>
        </div>

        {selectedTournament ? (
          <div className="metric-row">
            <div className="metric-pill">
              <span>Approved: {selectedTournament.joined_teams || 0}</span>
            </div>
            <div className="metric-pill">
              <span>Pending: {selectedTournament.pending_requests || 0}</span>
            </div>
            <div className="metric-pill">
              <span>Players: {selectedTournament.min_players}-{selectedTournament.max_players_per_team}</span>
            </div>
            <div className="metric-pill">
              <span>Approval: {selectedTournament.require_admin_approval ? "Manual" : "Auto"}</span>
            </div>
          </div>
        ) : (
          <p>Select a tournament to review registration activity.</p>
        )}

        {requestError ? <div className="form-message form-message--error">{requestError}</div> : null}
        {requestsLoading ? <p>Loading registration requests...</p> : null}

        {!requestsLoading && selectedTournament ? (
          requests.length ? (
            <div className="table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Requester</th>
                    <th>Contacts</th>
                    <th>Players</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="leaderboard-row">
                      <td>
                        <TeamIdentity
                          name={request.team_name}
                          logoUrl={request.team_logo_url}
                          subtitle={`Submitted ${new Date(request.created_at).toLocaleString()}`}
                        />
                      </td>
                      <td>
                        <div>{request.requester_name}</div>
                        <div className="table-subcopy">{request.requester_email}</div>
                      </td>
                      <td>
                        <div>{request.contact_email || "No email supplied"}</div>
                        <div className="table-subcopy">{request.contact_discord || request.contact_phone || "No extra contacts"}</div>
                      </td>
                      <td>
                        <div>{request.player_count} players</div>
                        <div className="table-subcopy">{(request.players || []).map((player) => player.player_name || player.player_uid).join(", ") || "No roster snapshot"}</div>
                      </td>
                      <td>
                        <div>{formatRequestStatus(request.status)}</div>
                        <div className="table-subcopy">{request.decision_reason || (request.approved_team_name ? `Approved as ${request.approved_team_name}` : "Awaiting review")}</div>
                      </td>
                      <td>
                        <div className="button-row">
                          <ActionButton
                            iconName="teams"
                            className="nav-button nav-button--ghost"
                            onClick={() => reviewRequest(request.id, "approved")}
                            disabled={request.status === "approved"}
                          >
                            Approve
                          </ActionButton>
                          <ActionButton
                            iconName="action"
                            className="nav-button nav-button--ghost"
                            onClick={() => reviewRequest(request.id, "declined")}
                          >
                            Decline
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No registration requests have been submitted for this tournament yet.</p>
          )
        ) : null}
      </section>

      <section className="page-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Tournament Registration Board</span>
            <h2>Approved Teams</h2>
          </div>
          <p>Approved teams move here automatically and start appearing in the dedicated points table.</p>
        </div>

        {registrationError ? <div className="form-message form-message--error">{registrationError}</div> : null}
        {registrationsLoading ? <p>Loading approved registrations...</p> : null}

        {!registrationsLoading && selectedTournament ? (
          registrations.length ? (
            <div className="table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Leader</th>
                    <th>Status</th>
                    <th>Players</th>
                    <th>Matches</th>
                    <th>Kills</th>
                    <th>Points</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration) => (
                    <tr key={registration.id} className="leaderboard-row">
                      <td>
                        <TeamIdentity
                          name={registration.name}
                          logoUrl={registration.logo_url}
                          subtitle={registration.disqualified ? (registration.disqualification_reason || "Disqualified") : "Eligible"}
                        />
                      </td>
                      <td>
                        <div>{registration.leader_name || "Unassigned"}</div>
                        <div className="table-subcopy">{registration.leader_email || "No email linked"}</div>
                      </td>
                      <td>{registration.disqualified ? "Disqualified" : "Active"}</td>
                      <td>{registration.player_count}</td>
                      <td>{registration.matches_played}</td>
                      <td>{registration.tournament_kills}</td>
                      <td>{registration.tournament_points}</td>
                      <td>
                        <div className="button-row">
                          <ActionButton
                            iconName="settings"
                            className="nav-button nav-button--ghost"
                            onClick={() => toggleRegistrationStatus(registration)}
                          >
                            {registration.disqualified ? "Reinstate" : "Disqualify"}
                          </ActionButton>
                          <ActionButton
                            iconName="teams"
                            className="nav-button nav-button--ghost"
                            onClick={() => removeRegistration(registration.id)}
                          >
                            Remove
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No approved teams for this tournament yet.</p>
          )
        ) : null}
      </section>

      <section className="entity-grid">
        {tournaments.map((tournament) => (
          <article key={tournament.id} className="page-card entity-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">{tournament.status}</span>
                <h3>{tournament.name}</h3>
              </div>
              <span className="entity-meta">#{tournament.id}</span>
            </div>
            <p>Date: {formatTournamentDate(tournament.date)}</p>
            <p>Entry Fee: Rs. {Number(tournament.entry_fee || 0).toLocaleString()}</p>
            <p>Prize Pool: Rs. {Number(tournament.prize_pool || 0).toLocaleString()}</p>
            <p>Teams: {tournament.joined_teams || 0}/{tournament.max_teams} approved</p>
            <p>Requests: {tournament.pending_requests || 0} pending</p>
            <p>Players per team: {tournament.min_players}-{tournament.max_players_per_team}</p>
            <div className="button-row">
              <ActionButton iconName="teams" className="nav-button nav-button--ghost" onClick={() => setSelectedTournamentId(String(tournament.id))}>Requests</ActionButton>
              <ActionButton to={`/tournaments/${tournament.id}/points-table`} iconName="stats" className="nav-button nav-button--ghost">Points Table</ActionButton>
              <ActionButton iconName="settings" className="nav-button nav-button--ghost" onClick={() => startEdit(tournament)}>Edit</ActionButton>
              <ActionButton iconName="tournaments" className="nav-button nav-button--ghost" onClick={() => removeTournament(tournament.id)}>Delete</ActionButton>
            </div>
          </article>
        ))}
      </section>
    </PageWrapper>
  );
}

export default AdminTournaments;
