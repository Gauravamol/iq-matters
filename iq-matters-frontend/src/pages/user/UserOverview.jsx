import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import StatCard from "../../components/ui/StatCard";
import Panel from "../../components/ui/Panel";

export default function UserOverview() {
  const { user, team, token, joinedTournamentIds } = useAuth();
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    apiRequest("/tournaments", { token }).then(setTournaments).catch(() => {
      setTournaments([]);
    });
  }, [token]);

  return (
    <div className="stack-xl">
      <section className="section-copy">
        <span className="eyebrow">PLAYER OVERVIEW</span>
        <h2>Welcome back, {user?.name}</h2>
        <p>Track team status, tournament join progress, and leaderboard access from one player-first control room.</p>
      </section>

      <section className="responsive-grid responsive-grid--stats">
        <StatCard label="My Team" value={team?.name || "No team yet"} detail="Create or manage your squad" />
        <StatCard label="Joined Tournaments" value={joinedTournamentIds.length} detail="Registered brackets" accent="green" />
        <StatCard label="Open Lobbies" value={tournaments.filter((item) => item.status !== "completed").length} detail="Available opportunities" />
      </section>

      <Panel glow="cyan" className="stack-md">
        <h3>Current profile snapshot</h3>
        <p>Email: {user?.email}</p>
        <p>Role: {user?.role}</p>
        <p>Team linked: {team ? "Yes" : "No"}</p>
      </Panel>
    </div>
  );
}
