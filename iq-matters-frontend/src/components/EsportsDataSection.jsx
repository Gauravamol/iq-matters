import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cardMotionProps } from "./PageWrapper";
import { apiRequest } from "../lib/api";
import { usePlatform } from "../context/PlatformContext";

function InfoCard({ title, description, eyebrow }) {
  return (
    <div className="info-card">
      <span className="eyebrow">{eyebrow}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function formatSchedule(value) {
  if (!value) {
    return "TBA";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "TBA" : date.toLocaleString();
}

function EsportsDataSection() {
  const { isFeatureEnabled } = usePlatform();
  const externalEnabled = isFeatureEnabled("external_api_integration", true);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!externalEnabled) {
      setOverview(null);
      return;
    }

    apiRequest("/external/esports/overview")
      .then(setOverview)
      .catch((requestError) => setError(requestError.message));
  }, [externalEnabled]);

  if (!externalEnabled) {
    return null;
  }

  return (
    <motion.section className="page-card stack-layout" {...cardMotionProps}>
      <div className="section-head">
        <div>
          <span className="eyebrow">External Esports Feed</span>
          <h2>Live Data Connections</h2>
        </div>
        <p>{overview?.message || error || "Upcoming matches, tournaments, teams, and schedules from the backend integration layer."}</p>
      </div>

      <div className="esports-feed-grid">
        <div className="feed-column">
          <h3>Matches</h3>
          {(overview?.matches || []).map((match) => (
            <InfoCard
              key={match.id}
              eyebrow={match.status}
              title={match.name}
              description={`${match.league} | ${match.opponents?.join(" vs ") || "Teams TBA"}`}
            />
          ))}
        </div>

        <div className="feed-column">
          <h3>Tournaments</h3>
          {(overview?.tournaments || []).map((tournament) => (
            <InfoCard
              key={tournament.id}
              eyebrow={tournament.league}
              title={tournament.name}
              description={`${formatSchedule(tournament.begin_at)} | ${tournament.prizepool || "Prize TBD"}`}
            />
          ))}
        </div>

        <div className="feed-column">
          <h3>Teams</h3>
          {(overview?.teams || []).map((team) => (
            <InfoCard
              key={team.id}
              eyebrow={team.acronym}
              title={team.name}
              description={team.current_videogame || "Esports"}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export default EsportsDataSection;
