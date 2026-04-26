import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import ActionButton from "../components/ActionButton";
import ManagedFileField from "../components/ManagedFileField";
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

function CreateTeam() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user, refreshSession } = useAuth();
  const [teamName, setTeamName] = useState("");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");
  const [players, setPlayers] = useState([
    createBlankPlayer(),
    createBlankPlayer(),
    createBlankPlayer(),
    createBlankPlayer()
  ]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const tournamentId = searchParams.get("tournament");

  async function createTeam(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await apiRequest("/create-team", {
        method: "POST",
        token,
        body: {
          team_name: teamName,
          team_logo_url: teamLogoUrl,
          leader_id: user.id,
          tournament_id: tournamentId ? Number(tournamentId) : undefined,
          players
        }
      });

      await refreshSession();
      setMessage(tournamentId ? "Team created and tournament registration submitted." : "Team created successfully.");
      setTimeout(() => navigate("/team-dashboard"), 400);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function updatePlayer(index, field, value) {
    const nextPlayers = [...players];
    nextPlayers[index] = {
      ...nextPlayers[index],
      [field]: value
    };
    setPlayers(nextPlayers);
  }

  return (
    <PageWrapper className="stack-layout">
      <div className="page-card page-card--form">
        <span className="eyebrow">{tournamentId ? "Tournament Registration" : "Team Creation"}</span>
        <h2>{tournamentId ? "Register Your Team" : "Create Team"}</h2>
        <form className="form-stack" onSubmit={createTeam}>
          <input className="form-input" placeholder="Team Name" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
          <ManagedFileField
            token={token}
            value={teamLogoUrl}
            onChange={setTeamLogoUrl}
            kind="logos"
            accept={logoFileAccept}
            placeholder="Team logo URL or upload a file"
            uploadLabel="Upload Team File"
          />
          <div className="form-grid">
            {players.map((player, index) => (
              <div key={index} className="page-card entity-card registration-player-card">
                <span className="eyebrow">Player {index + 1}</span>
                <input
                  className="form-input"
                  placeholder="Player Name"
                  value={player.player_name}
                  onChange={(event) => updatePlayer(index, "player_name", event.target.value)}
                />
                <input
                  className="form-input"
                  placeholder="Player UID"
                  value={player.player_uid}
                  onChange={(event) => updatePlayer(index, "player_uid", event.target.value)}
                />
                <ManagedFileField
                  token={token}
                  value={player.logo_url}
                  onChange={(nextUrl) => updatePlayer(index, "logo_url", nextUrl)}
                  kind="logos"
                  accept={logoFileAccept}
                  placeholder="Player logo URL or upload a file"
                  uploadLabel="Upload Player File"
                />
              </div>
            ))}
          </div>
          {message ? <div className="form-message form-message--success">{message}</div> : null}
          {error ? <div className="form-message form-message--error">{error}</div> : null}
          <ActionButton iconName="teams" type="submit">{tournamentId ? "Create Team and Register" : "Create Team"}</ActionButton>
        </form>
      </div>
    </PageWrapper>
  );
}

export default CreateTeam;
