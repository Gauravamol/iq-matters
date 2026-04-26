import React, { useEffect, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import AdminPanelNav from "../components/AdminPanelNav";
import ActionButton from "../components/ActionButton";
import ManagedFileField from "../components/ManagedFileField";
import TeamIdentity from "../components/TeamIdentity";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { logoFileAccept } from "../lib/fileTypes";

function createBlankPlayer() {
  return {
    player_name: "",
    player_uid: "",
    logo_url: ""
  };
}

const emptyForm = {
  id: null,
  name: "",
  leader_id: "",
  logo_url: "",
  players: [createBlankPlayer(), createBlankPlayer(), createBlankPlayer(), createBlankPlayer()]
};

function ensurePlayers(players) {
  return players?.length ? players : [createBlankPlayer(), createBlankPlayer(), createBlankPlayer(), createBlankPlayer()];
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
        logo_url: team.logo_url || "",
        players: ensurePlayers(players || [])
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function updatePlayer(index, field, value) {
    setForm((current) => {
      const nextPlayers = [...current.players];
      nextPlayers[index] = {
        ...nextPlayers[index],
        [field]: value
      };

      return {
        ...current,
        players: nextPlayers
      };
    });
  }

  function addPlayerRow() {
    setForm((current) => ({
      ...current,
      players: [...current.players, createBlankPlayer()]
    }));
  }

  function removePlayerRow(index) {
    setForm((current) => ({
      ...current,
      players: current.players.filter((_, playerIndex) => playerIndex !== index)
    }));
  }

  async function saveTeam(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const payload = {
      name: form.name,
      leader_id: form.leader_id ? Number(form.leader_id) : undefined,
      logo_url: form.logo_url,
      players: form.players.filter((player) => String(player.player_name || player.player_uid || player.logo_url || "").trim()).map((player) => ({
        player_name: player.player_name,
        player_uid: player.player_uid,
        logo_url: player.logo_url
      }))
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
            team_logo_url: payload.logo_url,
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
          <ManagedFileField
            token={token}
            value={form.logo_url}
            onChange={(nextUrl) => setForm({ ...form, logo_url: nextUrl })}
            kind="logos"
            accept={logoFileAccept}
            placeholder="Team logo URL or upload a file"
            uploadLabel="Upload Team File"
          />
          <select className="form-input" value={form.leader_id} onChange={(event) => setForm({ ...form, leader_id: event.target.value })}>
            <option value="">Select leader</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
            ))}
          </select>
          <div className="form-grid">
            {form.players.map((player, index) => (
              <div key={index} className="page-card entity-card registration-player-card">
                <span className="eyebrow">Player {index + 1}</span>
                <input className="form-input" placeholder="Player name" value={player.player_name || ""} onChange={(event) => updatePlayer(index, "player_name", event.target.value)} />
                <input className="form-input" placeholder="Player UID" value={player.player_uid || ""} onChange={(event) => updatePlayer(index, "player_uid", event.target.value)} />
                <ManagedFileField
                  token={token}
                  value={player.logo_url || ""}
                  onChange={(nextUrl) => updatePlayer(index, "logo_url", nextUrl)}
                  kind="logos"
                  accept={logoFileAccept}
                  placeholder="Player logo URL or upload a file"
                  uploadLabel="Upload Player File"
                />
                <ActionButton
                  type="button"
                  iconName="action"
                  className="nav-button nav-button--ghost"
                  onClick={() => removePlayerRow(index)}
                  disabled={form.players.length <= 1}
                >
                  Remove Player
                </ActionButton>
              </div>
            ))}
          </div>
          {message ? <div className="form-message form-message--success">{message}</div> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}
          <div className="button-row">
            <ActionButton type="button" iconName="teams" className="nav-button nav-button--ghost" onClick={addPlayerRow}>Add Player</ActionButton>
            <ActionButton iconName="teams" type="submit">{form.id ? "Save Team" : "Create Team"}</ActionButton>
          </div>
        </form>
      </section>

      <section className="entity-grid">
        {teams.map((team) => (
          <article key={team.id} className="page-card entity-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Team</span>
                <TeamIdentity name={team.name} logoUrl={team.logo_url} />
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
