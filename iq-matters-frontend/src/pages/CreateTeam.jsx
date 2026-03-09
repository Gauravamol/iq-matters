import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import ActionButton from "../components/ActionButton";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";

function CreateTeam() {
  const navigate = useNavigate();
  const { token, user, refreshSession } = useAuth();
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState(["", "", "", ""]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function createTeam() {
    setMessage("");
    setError("");

    try {
      await apiRequest("/create-team", {
        method: "POST",
        token,
        body: {
          team_name: teamName,
          leader_id: user.id,
          players
        }
      });

      await refreshSession();
      setMessage("Team created successfully.");
      setTimeout(() => navigate("/team-dashboard"), 400);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function updatePlayer(index, value) {
    const nextPlayers = [...players];
    nextPlayers[index] = value;
    setPlayers(nextPlayers);
  }

  return (
    <PageWrapper className="stack-layout">
      <div className="page-card page-card--form">
        <span className="eyebrow">Team Creation</span>
        <h2>Create Team</h2>
        <input className="form-input" placeholder="Team Name" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
        <div className="form-stack">
          {players.map((player, index) => (
            <input
              key={index}
              className="form-input"
              placeholder={`Player ${index + 1} UID`}
              value={player}
              onChange={(event) => updatePlayer(index, event.target.value)}
            />
          ))}
        </div>
        {message ? <div className="form-message form-message--success">{message}</div> : null}
        {error ? <div className="form-message form-message--error">{error}</div> : null}
        <ActionButton iconName="teams" onClick={createTeam}>Create Team</ActionButton>
      </div>
    </PageWrapper>
  );
}

export default CreateTeam;
