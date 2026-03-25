import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import Button from "../../components/ui/Button";
import InputField from "../../components/ui/InputField";
import Panel from "../../components/ui/Panel";
import StatCard from "../../components/ui/StatCard";

export default function TeamHub() {
  const { token, user, team, refreshSession } = useAuth();
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState({ team_name: "", p1: "", p2: "", p3: "", p4: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!team) {
      setPlayers([]);
      return;
    }

    apiRequest(`/players/${team.id}`, { token }).then(setPlayers).catch(() => {
      setPlayers([]);
    });
  }, [team, token]);

  async function handleCreateTeam(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await apiRequest("/create-team", {
        method: "POST",
        token,
        body: {
          team_name: form.team_name,
          leader_id: user.id,
          players: [form.p1, form.p2, form.p3, form.p4]
        }
      });

      await refreshSession();
      setMessage("Team created successfully.");
      setForm({ team_name: "", p1: "", p2: "", p3: "", p4: "" });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="stack-xl">
      <section className="section-copy">
        <span className="eyebrow">MY TEAM</span>
        <h2>{team ? team.name : "Build your squad"}</h2>
        <p>{team ? "Review your roster and season totals." : "Create a BGMI roster and unlock tournament joins."}</p>
      </section>

      {team ? (
        <>
          <section className="responsive-grid responsive-grid--stats">
            <StatCard label="Total Points" value={team.total_points} detail="Career total" />
            <StatCard label="Total Kills" value={team.total_kills} detail="Accumulated across results" accent="green" />
            <StatCard label="Matches Played" value={team.matches_played} detail="Submitted match count" />
          </section>

          <Panel glow="green" className="stack-md">
            <h3>Roster</h3>
            <div className="roster-list">
              {players.map((player) => (
                <div key={player.id} className="roster-list__item">
                  <strong>{player.player_name}</strong>
                  <span>{player.player_uid}</span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : (
        <Panel glow="cyan" className="stack-md">
          <h3>Create a team</h3>
          <form className="stack-md" onSubmit={handleCreateTeam}>
            <InputField label="Team Name" value={form.team_name} onChange={(event) => setForm({ ...form, team_name: event.target.value })} />
            <div className="responsive-grid responsive-grid--two">
              <InputField label="Player 1 UID" value={form.p1} onChange={(event) => setForm({ ...form, p1: event.target.value })} />
              <InputField label="Player 2 UID" value={form.p2} onChange={(event) => setForm({ ...form, p2: event.target.value })} />
              <InputField label="Player 3 UID" value={form.p3} onChange={(event) => setForm({ ...form, p3: event.target.value })} />
              <InputField label="Player 4 UID" value={form.p4} onChange={(event) => setForm({ ...form, p4: event.target.value })} />
            </div>
            {message ? <div className="banner banner--success">{message}</div> : null}
            {error ? <div className="banner banner--error">{error}</div> : null}
            <Button type="submit">Create Team</Button>
          </form>
        </Panel>
      )}
    </div>
  );
}
