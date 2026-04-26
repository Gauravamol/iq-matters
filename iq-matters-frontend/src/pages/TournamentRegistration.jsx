import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import ActionButton from "../components/ActionButton";
import ManagedFileField from "../components/ManagedFileField";
import TeamIdentity from "../components/TeamIdentity";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { logoFileAccept } from "../lib/fileTypes";

function createPlayerRows(count) {
  return Array.from({ length: Math.max(Number(count || 1), 1) }, () => ({
    player_name: "",
    player_uid: "",
    logo_url: ""
  }));
}

function formatTournamentDate(value) {
  if (!value) {
    return "Schedule dropping soon";
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? "Schedule dropping soon" : parsedDate.toLocaleString();
}

function TournamentRegistration() {
  const { id } = useParams();
  const { token, refreshSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState(null);
  const [form, setForm] = useState({
    team_name: "",
    team_logo_url: "",
    contact_email: "",
    contact_discord: "",
    contact_phone: "",
    players: createPlayerRows(4)
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadContext();
  }, [id, token]);

  async function loadContext() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/tournaments/${id}/registration-form`, { token });
      setContext(data || null);

      if (data?.team) {
        setForm((current) => ({
          ...current,
          team_name: data.team.name || "",
          team_logo_url: data.team.logo_url || "",
          players: (data.team.players || []).map((player) => ({
            player_name: player.player_name || "",
            player_uid: player.player_uid || "",
            logo_url: player.logo_url || ""
          }))
        }));
      } else {
        const minimumPlayers = Number(data?.tournament?.min_players || 1);
        setForm({
          team_name: "",
          team_logo_url: "",
          contact_email: "",
          contact_discord: "",
          contact_phone: "",
          players: createPlayerRows(minimumPlayers)
        });
      }
    } catch (requestErrorValue) {
      setContext(null);
      setError(requestErrorValue.message);
    } finally {
      setLoading(false);
    }
  }

  function updatePlayer(index, field, value) {
    setForm((current) => ({
      ...current,
      players: current.players.map((player, playerIndex) => (
        playerIndex === index ? { ...player, [field]: value } : player
      ))
    }));
  }

  function addPlayer() {
    const maximumPlayers = Number(context?.tournament?.max_players_per_team || 4);

    setForm((current) => {
      if (current.players.length >= maximumPlayers) {
        return current;
      }

      return {
        ...current,
        players: [
          ...current.players,
          {
            player_name: "",
            player_uid: "",
            logo_url: ""
          }
        ]
      };
    });
  }

  function removePlayer(index) {
    const minimumPlayers = Number(context?.tournament?.min_players || 1);

    setForm((current) => {
      if (current.players.length <= minimumPlayers) {
        return current;
      }

      return {
        ...current,
        players: current.players.filter((_, playerIndex) => playerIndex !== index)
      };
    });
  }

  async function submitRegistration(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = context?.team
        ? {
          use_existing_team: true,
          contact_email: form.contact_email,
          contact_discord: form.contact_discord,
          contact_phone: form.contact_phone
        }
        : {
          use_existing_team: false,
          team_name: form.team_name,
          team_logo_url: form.team_logo_url,
          contact_email: form.contact_email,
          contact_discord: form.contact_discord,
          contact_phone: form.contact_phone,
          players: form.players.filter((player) => (
            String(player.player_name || player.player_uid || player.logo_url || "").trim()
          ))
        };

      const response = await apiRequest(`/tournaments/${id}/registration-requests`, {
        method: "POST",
        token,
        body: payload
      });

      if (response?.auto_approved) {
        await refreshSession();
      }

      await loadContext();
      setMessage(response?.message || (response?.auto_approved ? "Registration approved." : "Registration submitted for review."));
    } catch (requestErrorValue) {
      setError(requestErrorValue.message);
    } finally {
      setSaving(false);
    }
  }

  const tournament = context?.tournament || null;
  const latestRequest = context?.latest_request || null;
  const existingRegistration = context?.existing_registration || null;
  const canEditRoster = !context?.team;
  const minimumPlayers = Number(tournament?.min_players || 1);
  const maximumPlayers = Number(tournament?.max_players_per_team || 4);

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="tournaments"
        eyebrow="Registration Form"
        title={tournament?.name ? `${tournament.name} Registration` : "Tournament Registration"}
        description="Submit your roster through the tournament-specific registration form and let the admin approve or decline it."
      />

      {loading ? <section className="page-card"><p>Loading tournament registration form...</p></section> : null}
      {error ? <section className="page-card"><div className="form-message form-message--error">{error}</div></section> : null}

      {!loading && tournament ? (
        <>
          <section className="page-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Tournament Setup</span>
                <h2>{tournament.name}</h2>
              </div>
              <div className="button-row">
                <ActionButton to={`/tournaments/${tournament.id}/points-table`} iconName="stats" className="nav-button nav-button--ghost">Points Table</ActionButton>
                <ActionButton to="/tournaments" iconName="tournaments" className="nav-button nav-button--ghost">Back to Tournaments</ActionButton>
              </div>
            </div>
            <div className="metric-row">
              <div className="metric-pill">
                <span>Date: {formatTournamentDate(tournament.date)}</span>
              </div>
              <div className="metric-pill">
                <span>Teams: {tournament.joined_teams || 0}/{tournament.max_teams}</span>
              </div>
              <div className="metric-pill">
                <span>Roster: {minimumPlayers}-{maximumPlayers} players</span>
              </div>
              <div className="metric-pill">
                <span>Approval: {tournament.require_admin_approval ? "Manual review" : "Instant approval"}</span>
              </div>
            </div>
          </section>

          {message ? <section className="page-card"><div className="form-message form-message--success">{message}</div></section> : null}

          {existingRegistration ? (
            <section className="page-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Registration Status</span>
                  <h2>{existingRegistration.disqualified ? "Team Disqualified" : "Team Approved"}</h2>
                </div>
              </div>
              <p>
                {existingRegistration.disqualified
                  ? (existingRegistration.disqualification_reason || "This team has been disqualified for the tournament.")
                  : "Your team is already approved and listed in the tournament points table."}
              </p>
            </section>
          ) : null}

          {latestRequest?.status === "pending" ? (
            <section className="page-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Pending Review</span>
                  <h2>Registration Awaiting Approval</h2>
                </div>
              </div>
              <p>Your registration request has been submitted and is waiting for admin approval.</p>
              <p>{latestRequest.decision_reason || "No admin note yet."}</p>
            </section>
          ) : null}

          {!existingRegistration && latestRequest?.status !== "pending" ? (
            <section className="page-card page-card--form">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Team Submission</span>
                  <h2>{context?.team ? "Register Existing Team" : "Submit New Team"}</h2>
                </div>
                {latestRequest?.status === "declined" ? (
                  <p>{latestRequest.decision_reason || "Your last request was declined. Update the details below and resubmit."}</p>
                ) : (
                  <p>Dedicated registration forms let the admin review contact details, roster size, and team branding before approval.</p>
                )}
              </div>

              {context?.team ? (
                <div className="page-card entity-card">
                  <TeamIdentity name={context.team.name} logoUrl={context.team.logo_url} subtitle={`${context.team.players.length} registered players`} />
                  <div className="table-subcopy">{context.team.players.map((player) => player.player_name || player.player_uid).join(", ")}</div>
                </div>
              ) : null}

              <form className="form-stack" onSubmit={submitRegistration}>
                {!context?.team ? (
                  <div className="form-grid">
                    <input className="form-input" placeholder="Team name" value={form.team_name} onChange={(event) => setForm({ ...form, team_name: event.target.value })} />
                    {tournament.allow_team_logo ? (
                      <ManagedFileField
                        token={token}
                        value={form.team_logo_url}
                        onChange={(nextUrl) => setForm({ ...form, team_logo_url: nextUrl })}
                        kind="logos"
                        accept={logoFileAccept}
                        placeholder="Team logo URL or upload a file"
                        uploadLabel="Upload Team File"
                      />
                    ) : null}
                  </div>
                ) : null}

                {tournament.show_contact_email_field || tournament.show_contact_discord_field || tournament.show_contact_phone_field ? (
                  <div className="form-grid">
                    {tournament.show_contact_email_field ? (
                      <input className="form-input" type="email" placeholder="Team email (optional)" value={form.contact_email} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} />
                    ) : null}
                    {tournament.show_contact_discord_field ? (
                      <input className="form-input" placeholder="Discord ID (optional)" value={form.contact_discord} onChange={(event) => setForm({ ...form, contact_discord: event.target.value })} />
                    ) : null}
                    {tournament.show_contact_phone_field ? (
                      <input className="form-input" placeholder="Phone number (optional)" value={form.contact_phone} onChange={(event) => setForm({ ...form, contact_phone: event.target.value })} />
                    ) : null}
                  </div>
                ) : null}

                {canEditRoster ? (
                  <>
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">Roster Builder</span>
                        <h3>Players</h3>
                      </div>
                      <p>Add between {minimumPlayers} and {maximumPlayers} players for this tournament.</p>
                    </div>
                    <div className="entity-grid">
                      {form.players.map((player, index) => (
                        <div key={index} className="page-card entity-card registration-player-card">
                          <div className="section-head">
                            <div>
                              <span className="eyebrow">Player {index + 1}</span>
                            </div>
                            <ActionButton
                              type="button"
                              iconName="action"
                              className="nav-button nav-button--ghost"
                              onClick={() => removePlayer(index)}
                              disabled={form.players.length <= minimumPlayers}
                            >
                              Remove
                            </ActionButton>
                          </div>
                          <input className="form-input" placeholder="Player name" value={player.player_name} onChange={(event) => updatePlayer(index, "player_name", event.target.value)} />
                          <input className="form-input" placeholder="Player UID" value={player.player_uid} onChange={(event) => updatePlayer(index, "player_uid", event.target.value)} />
                          {tournament.allow_player_logo ? (
                            <ManagedFileField
                              token={token}
                              value={player.logo_url}
                              onChange={(nextUrl) => updatePlayer(index, "logo_url", nextUrl)}
                              kind="logos"
                              accept={logoFileAccept}
                              placeholder="Player logo URL or upload a file"
                              uploadLabel="Upload Player File"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <ActionButton
                      type="button"
                      iconName="teams"
                      className="nav-button nav-button--ghost"
                      onClick={addPlayer}
                      disabled={form.players.length >= maximumPlayers}
                    >
                      Add Player
                    </ActionButton>
                  </>
                ) : null}

                <ActionButton iconName="tournaments" type="submit" disabled={saving}>
                  {saving ? "Submitting..." : (tournament.require_admin_approval ? "Submit Registration" : "Submit and Approve")}
                </ActionButton>
              </form>
            </section>
          ) : null}
        </>
      ) : null}
    </PageWrapper>
  );
}

export default TournamentRegistration;
