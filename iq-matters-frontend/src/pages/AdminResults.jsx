import React, { useEffect, useMemo, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import AdminPanelNav from "../components/AdminPanelNav";
import ActionButton from "../components/ActionButton";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const emptyForm = {
  id: null,
  tournament_id: "",
  match_id: "",
  team_id: "",
  position: "",
  kills: ""
};

function AdminResults() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    try {
      const [tournamentData, matchData, teamData, resultData] = await Promise.all([
        apiRequest("/admin/tournaments", { token }),
        apiRequest("/admin/matches", { token }),
        apiRequest("/admin/teams", { token }),
        apiRequest("/admin/results", { token })
      ]);

      setTournaments(tournamentData || []);
      setMatches(matchData || []);
      setTeams(teamData || []);
      setResults(resultData || []);
      setForm((current) => ({ ...current, tournament_id: current.tournament_id || String(tournamentData?.[0]?.id || "") }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const filteredMatches = useMemo(() => matches.filter((match) => String(match.tournament_id) === String(form.tournament_id)), [matches, form.tournament_id]);

  function resetForm() {
    setForm({ ...emptyForm, tournament_id: String(tournaments[0]?.id || "") });
  }

  function startEdit(result) {
    setForm({
      id: result.id,
      tournament_id: String(result.tournament_id),
      match_id: String(result.match_id),
      team_id: String(result.team_id),
      position: String(result.position),
      kills: String(result.kills)
    });
    setMessage("");
    setError("");
  }

  async function saveResult(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const payload = {
      tournament_id: Number(form.tournament_id),
      match_id: Number(form.match_id),
      team_id: Number(form.team_id),
      position: Number(form.position),
      kills: Number(form.kills)
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
          <select className="form-input" value={form.match_id} onChange={(event) => setForm({ ...form, match_id: event.target.value })}>
            <option value="">Select match</option>
            {filteredMatches.map((match) => (
              <option key={match.id} value={match.id}>Match {match.match_number} - {match.map_name}</option>
            ))}
          </select>
          <select className="form-input" value={form.team_id} onChange={(event) => setForm({ ...form, team_id: event.target.value })}>
            <option value="">Select team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <input className="form-input" placeholder="Position" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
          <input className="form-input" placeholder="Kills" value={form.kills} onChange={(event) => setForm({ ...form, kills: event.target.value })} />
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
