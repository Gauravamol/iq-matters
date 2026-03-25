import React, { useEffect, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import AdminPanelNav from "../components/AdminPanelNav";
import ActionButton from "../components/ActionButton";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const emptyForm = {
  id: null,
  name: "",
  leader_id: "",
  players_text: ""
};

function parsePlayers(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function AdminTeams() {
  const { token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    try {
      const [teamData, userData] = await Promise.all([
        apiRequest("/admin/teams", { token }),
        apiRequest("/admin/users", { token })
      ]);

      setTeams(teamData || []);
      setUsers(userData || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function resetForm() {
    setForm(emptyForm);
  }

  async function startEdit(team) {
    setMessage("");
    setError("");

    try {
      const players = await apiRequest(`/players/${team.id}`, { token });
      setForm({
        id: team.id,
        name: team.name,
        leader_id: String(team.leader_id || ""),
        players_text: (players || []).map((player) => player.player_uid).join("\n")
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveTeam(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const payload = {
      name: form.name,
      leader_id: Number(form.leader_id),
      players: parsePlayers(form.players_text)
    };

    try {
      if (form.id) {
        await apiRequest(`/admin/teams/${form.id}`, {
          method: "PUT",
          token,
          body: payload
        });
        setMessage("Team updated.");
      } else {
        await apiRequest("/admin/teams", {
          method: "POST",
          token,
          body: {
            team_name: payload.name,
            leader_id: payload.leader_id,
            players: payload.players
          }
        });
        setMessage("Team created.");
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeTeam(id) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/admin/teams/${id}`, {
        method: "DELETE",
        token
      });
      setMessage("Team deleted.");
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
        page="team-dashboard"
        eyebrow="Admin Teams"
        title="Manage Teams"
        description="Create teams, reassign leaders, refresh player UIDs, and delete unused rosters from the admin panel."
      />

      <AdminPanelNav />

      <section className="page-card page-card--form">
        <div className="section-head">
          <div>
            <span className="eyebrow">Team Form</span>
            <h2>{form.id ? "Edit Team" : "Create Team"}</h2>
          </div>
          {form.id ? <ActionButton iconName="action" className="nav-button nav-button--ghost" onClick={resetForm}>Cancel Edit</ActionButton> : null}
        </div>
        <form className="form-stack" onSubmit={saveTeam}>
          <input className="form-input" placeholder="Team name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <select className="form-input" value={form.leader_id} onChange={(event) => setForm({ ...form, leader_id: event.target.value })}>
            <option value="">Select leader</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
            ))}
          </select>
          <textarea className="form-input form-textarea" placeholder="Player UIDs, one per line or comma separated" value={form.players_text} onChange={(event) => setForm({ ...form, players_text: event.target.value })} />
          {message ? <div className="form-message form-message--success">{message}</div> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}
          <ActionButton iconName="teams" type="submit">{form.id ? "Save Team" : "Create Team"}</ActionButton>
        </form>
      </section>

      <section className="entity-grid">
        {teams.map((team) => (
          <article key={team.id} className="page-card entity-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Team</span>
                <h3>{team.name}</h3>
              </div>
              <span className="entity-meta">#{team.id}</span>
            </div>
            <p>Leader: {team.leader_name || "Unassigned"}</p>
            <p>Players: {team.player_count}</p>
            <p>Joined tournaments: {team.joined_tournaments}</p>
            <div className="button-row">
              <ActionButton iconName="settings" className="nav-button nav-button--ghost" onClick={() => startEdit(team)}>Edit</ActionButton>
              <ActionButton iconName="teams" className="nav-button nav-button--ghost" onClick={() => removeTeam(team.id)}>Delete</ActionButton>
            </div>
          </article>
        ))}
      </section>
    </PageWrapper>
  );
}

export default AdminTeams;
