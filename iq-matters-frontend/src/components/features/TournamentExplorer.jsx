import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Tilt from "react-parallax-tilt";
import { motion } from "framer-motion";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Panel from "../ui/Panel";

export default function TournamentExplorer({ compact = false }) {
  const navigate = useNavigate();
  const { token, team, isAuthenticated, refreshSession } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadTournaments();
  }, [token]);

  async function loadTournaments() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/tournaments", { token });
      setTournaments(data || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(tournamentId) {
    setNotice("");

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!team) {
      setNotice("Create your team before joining a tournament.");
      navigate("/dashboard/team");
      return;
    }

    try {
      await apiRequest("/join-tournament", {
        method: "POST",
        token,
        body: {
          tournament_id: tournamentId,
          team_id: team.id
        }
      });

      await refreshSession();
      await loadTournaments();
      setNotice("Tournament registration confirmed.");
    } catch (requestError) {
      setNotice(requestError.message);
    }
  }

  return (
    <div className="stack-lg">
      {!compact ? (
        <div className="section-copy">
          <span className="eyebrow">OPEN EVENTS</span>
          <h2>Tournament explorer</h2>
          <p>Track brackets, prize pools, and squad slots from a single competitive lobby.</p>
        </div>
      ) : null}

      {notice ? <div className="banner banner--info">{notice}</div> : null}
      {error ? <div className="banner banner--error">{error}</div> : null}

      {loading ? <Panel className="empty-state">Loading tournaments...</Panel> : null}

      <div className="responsive-grid responsive-grid--cards">
        {tournaments.map((tournament, index) => (
          <Tilt key={tournament.id} glareEnable tiltMaxAngleX={8} tiltMaxAngleY={8} scale={1.01}>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.04 }}>
              <Panel glow={index % 2 === 0 ? "cyan" : "green"} className="tournament-card">
                <div className="row-between">
                  <Badge tone={tournament.status === "live" ? "danger" : tournament.is_joined ? "success" : "neutral"}>
                    {tournament.status}
                  </Badge>
                  <span className="tournament-card__slots">
                    {tournament.joined_teams}/{tournament.max_teams} teams
                  </span>
                </div>

                <div>
                  <h3>{tournament.name}</h3>
                  <p>{tournament.date ? new Date(tournament.date).toLocaleString() : "Schedule dropping soon"}</p>
                </div>

                <div className="tournament-card__meta">
                  <div>
                    <span>Entry Fee</span>
                    <strong>Rs. {Number(tournament.entry_fee || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Prize Pool</span>
                    <strong>Rs. {Number(tournament.prize_pool || 0).toLocaleString()}</strong>
                  </div>
                </div>

                <Button
                  variant={tournament.is_joined ? "ghost" : "primary"}
                  onClick={() => handleJoin(tournament.id)}
                  disabled={Boolean(tournament.is_joined)}
                >
                  {tournament.is_joined ? "Joined" : "Join Tournament"}
                </Button>
              </Panel>
            </motion.div>
          </Tilt>
        ))}
      </div>
    </div>
  );
}
