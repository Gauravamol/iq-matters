import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Medal, Trophy, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper, { cardMotionProps } from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import ActionButton from "../components/ActionButton";
import PageVideoSection from "../components/PageVideoSection";
import EsportsDataSection from "../components/EsportsDataSection";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

const tournamentVideos = [
  {
    title: "Official Tournament Promo",
    description: "Admin can replace this tournament feature video from the centralized media panel.",
    source: "https://www.youtube.com/watch?v=77uJNk-l2gE"
  }
];

function formatTournamentDate(value) {
  if (!value) {
    return "Schedule dropping soon";
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? "Schedule dropping soon" : parsedDate.toLocaleString();
}

function getTournamentActionLabel(tournament) {
  if (tournament.is_joined) {
    return "Approved";
  }

  if (!tournament.registration_open) {
    return tournament.registration_reason || "Registration closed";
  }

  return "Open Registration Form";
}

function TournamentMetric({ icon: Icon, label, value }) {
  return (
    <div className="metric-pill">
      <Icon size={16} />
      <span>{label}: {value}</span>
    </div>
  );
}

function Tournaments() {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadTournaments();
  }, [token]);

  async function loadTournaments() {
    try {
      const data = await apiRequest("/tournaments", { token });
      setTournaments(data || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function joinTournament(id) {
    setMessage("");
    setError("");

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    navigate(`/tournaments/${id}/register`);
  }

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="tournaments"
        eyebrow="Tournament Grid"
        title="Tournaments"
        description="Browse scrims, qualifiers, and prize events with esports-style cards, media, and live registration controls."
      />

      <motion.section className="page-card" {...cardMotionProps}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Tournament Lobby</span>
            <h2>Join Active Events</h2>
          </div>
          <p>Entry fee, prize pool, teams joined, and status are surfaced directly inside each tournament card.</p>
        </div>
        {message ? <div className="form-message form-message--success">{message}</div> : null}
        {error ? <div className="form-message form-message--error">{error}</div> : null}
      </motion.section>

      <div className="stats-grid">
        {tournaments.map((tournament, index) => (
          <motion.article
            key={tournament.id}
            className="page-card tournament-card"
            {...cardMotionProps}
            transition={{ ...cardMotionProps.transition, delay: Math.min(index * 0.04, 0.2) }}
          >
            <div className="card-heading-row">
              <div>
                <span className="eyebrow">{tournament.status}</span>
                <h3>{tournament.name}</h3>
                <p>{formatTournamentDate(tournament.date)}</p>
              </div>
              <Trophy className="card-icon" size={24} />
            </div>

            <div className="metric-row">
              <TournamentMetric icon={Trophy} label="Prize" value={`Rs. ${Number(tournament.prize_pool || 0).toLocaleString()}`} />
              <TournamentMetric icon={Users} label="Teams" value={`${tournament.joined_teams || 0}/${tournament.max_teams}`} />
              <TournamentMetric icon={Medal} label="Entry" value={`Rs. ${Number(tournament.entry_fee || 0).toLocaleString()}`} />
              <TournamentMetric icon={Users} label="Spots" value={tournament.registration_open ? `${tournament.spots_left || 0} left` : (tournament.registration_reason || "Closed")} />
            </div>

            <div className="button-row">
              <ActionButton
                iconName="tournaments"
                onClick={() => joinTournament(tournament.id)}
                disabled={Boolean(tournament.is_joined || !tournament.registration_open)}
              >
                {getTournamentActionLabel(tournament)}
              </ActionButton>
              <ActionButton to={`/tournaments/${tournament.id}/points-table`} iconName="stats" className="nav-button nav-button--ghost">
                Points Table
              </ActionButton>
            </div>
          </motion.article>
        ))}
      </div>

      <PageVideoSection
        slot="tournaments-video"
        title="Tournament Broadcast"
        description="Feature a tournament promo or official gameplay clip directly inside the event screen."
        fallbackVideos={tournamentVideos}
      />

      <EsportsDataSection />
    </PageWrapper>
  );
}

export default Tournaments;
