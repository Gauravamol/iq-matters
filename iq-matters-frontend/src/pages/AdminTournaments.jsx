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
  date: "",
  entry_fee: "",
  prize_pool: "",
  max_teams: "",
  status: "upcoming"
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

function AdminTournaments() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadTournaments();
  }, [token]);

  async function loadTournaments() {
    try {
      const data = await apiRequest("/admin/tournaments", { token });
      setTournaments(data || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function resetForm() {
    setForm(emptyForm);
  }

  function startEdit(tournament) {
    setForm({
      id: tournament.id,
      name: tournament.name,
      date: formatDateForInput(tournament.date),
      entry_fee: String(tournament.entry_fee || 0),
      prize_pool: String(tournament.prize_pool || 0),
      max_teams: String(tournament.max_teams || 0),
      status: tournament.status || "upcoming"
    });
    setMessage("");
    setError("");
  }

  async function saveTournament(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const payload = {
      name: form.name,
      date: formatDateForApi(form.date),
      entry_fee: Number(form.entry_fee || 0),
      prize_pool: Number(form.prize_pool || 0),
      max_teams: Number(form.max_teams || 0),
      status: form.status
    };

    try {
      if (form.id) {
        await apiRequest(`/admin/tournaments/${form.id}`, {
          method: "PUT",
          token,
          body: payload
        });
        setMessage("Tournament updated.");
      } else {
        await apiRequest("/admin/tournaments", {
          method: "POST",
          token,
          body: payload
        });
        setMessage("Tournament created.");
      }

      resetForm();
      await loadTournaments();
    } catch (requestError) {
      setError(requestError.message);
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
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="tournaments"
        eyebrow="Admin Tournaments"
        title="Manage Tournaments"
        description="Create, edit, and delete tournaments while keeping registration and leaderboard data consistent."
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
          {message ? <div className="form-message form-message--success">{message}</div> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}
          <ActionButton iconName="tournaments" type="submit">{form.id ? "Save Tournament" : "Create Tournament"}</ActionButton>
        </form>
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
            <p>Date: {tournament.date ? new Date(tournament.date).toLocaleString() : "Not scheduled"}</p>
            <p>Entry Fee: Rs. {Number(tournament.entry_fee || 0).toLocaleString()}</p>
            <p>Prize Pool: Rs. {Number(tournament.prize_pool || 0).toLocaleString()}</p>
            <p>Teams: {tournament.joined_teams || 0}/{tournament.max_teams}</p>
            <div className="button-row">
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
