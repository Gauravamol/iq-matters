import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Crosshair, Download, Medal, Trophy, Users } from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import HeroMediaBanner from "../components/HeroMediaBanner";
import ActionButton from "../components/ActionButton";
import TeamIdentity from "../components/TeamIdentity";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { useParams } from "react-router-dom";

function formatTournamentDate(value) {
  if (!value) {
    return "Schedule dropping soon";
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? "Schedule dropping soon" : parsedDate.toLocaleString();
}

function formatAverage(value) {
  return Number(value || 0).toFixed(2);
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function exportPointsTableImage({ tournament, leaderboard, stats }) {
  const width = 1440;
  const rowHeight = 54;
  const headerHeight = 96;
  const rules = Array.isArray(tournament?.points_system) ? tournament.points_system : [];
  const topFraggers = stats?.topFraggers?.slice(0, 5) || [];
  const summary = stats?.summary || {};
  const detailRowCount = Math.max(rules.length, topFraggers.length, 3);
  const height = 480 + (leaderboard.length * rowHeight) + (detailRowCount * 32);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas export is not supported in this browser.");
  }

  canvas.width = width;
  canvas.height = height;

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#08121f");
  background.addColorStop(0.55, "#0c1b2f");
  background.addColorStop(1, "#07111d");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.2, 0, 0, width * 0.2, 0, width * 0.7);
  glow.addColorStop(0, "rgba(75, 240, 177, 0.18)");
  glow.addColorStop(1, "rgba(75, 240, 177, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#4bf0b1";
  context.font = "700 22px Orbitron, Arial, sans-serif";
  context.fillText("Dedicated Tournament Points Table", 68, 68);

  context.fillStyle = "#ffffff";
  context.font = "700 42px Orbitron, Arial, sans-serif";
  context.fillText(tournament?.name || "Tournament", 68, 124);

  context.fillStyle = "rgba(237, 244, 255, 0.72)";
  context.font = "500 18px Space Grotesk, Arial, sans-serif";
  context.fillText(formatTournamentDate(tournament?.date), 68, 158);
  context.fillText(`Auto-updated from submitted match results`, 68, 188);

  const statPills = [
    `Approved Teams: ${Number(tournament?.joined_teams || 0)}/${Number(tournament?.max_teams || 0)}`,
    `Matches Logged: ${Number(summary.total_matches || 0)}`,
    `Kills Recorded: ${Number(summary.total_kills || 0)}`,
    `Roster Range: ${Number(tournament?.min_players || 1)}-${Number(tournament?.max_players_per_team || 4)}`
  ];

  let pillX = 68;
  statPills.forEach((label) => {
    const pillWidth = context.measureText(label).width + 34;
    drawRoundedRect(context, pillX, 216, pillWidth, 36, 18);
    context.fillStyle = "rgba(255, 255, 255, 0.06)";
    context.fill();
    context.strokeStyle = "rgba(75, 240, 177, 0.18)";
    context.stroke();
    context.fillStyle = "#edf4ff";
    context.fillText(label, pillX + 17, 240);
    pillX += pillWidth + 12;
  });

  drawRoundedRect(context, 56, 286, width - 112, headerHeight + (leaderboard.length * rowHeight), 26);
  context.fillStyle = "rgba(5, 11, 20, 0.78)";
  context.fill();
  context.strokeStyle = "rgba(75, 240, 177, 0.18)";
  context.stroke();

  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  context.fillRect(56, 286, width - 112, headerHeight);

  const columnX = [92, 172, 610, 820, 1010, 1188];
  const headers = ["#", "Team", "Matches", "Kills", "Points", "Status"];
  context.fillStyle = "#4bf0b1";
  context.font = "700 20px Orbitron, Arial, sans-serif";
  headers.forEach((label, index) => {
    context.fillText(label, columnX[index], 344);
  });

  context.font = "600 18px Space Grotesk, Arial, sans-serif";

  leaderboard.forEach((team, index) => {
    const y = 382 + (index * rowHeight);
    const rank = index + 1;

    if (rank === 1) {
      context.fillStyle = "rgba(255, 210, 77, 0.14)";
    } else if (rank <= 3) {
      context.fillStyle = "rgba(75, 240, 177, 0.08)";
    } else {
      context.fillStyle = "rgba(255, 255, 255, 0.03)";
    }

    drawRoundedRect(context, 72, y - 28, width - 144, 42, 16);
    context.fill();

    context.fillStyle = "#edf4ff";
    context.fillText(String(rank), columnX[0], y);
    context.fillText(String(team.name || "Team"), columnX[1], y);
    context.fillText(String(Number(team.matches_played || 0)), columnX[2], y);
    context.fillText(String(Number(team.kills || 0)), columnX[3], y);
    context.fillText(String(Number(team.points || 0)), columnX[4], y);
    context.fillText(rank === 1 ? "Leader" : rank <= 3 ? "Elite" : "Active", columnX[5], y);
  });

  const panelY = 342 + headerHeight + (leaderboard.length * rowHeight) + 38;
  const panelWidth = (width - 148) / 2;

  drawRoundedRect(context, 56, panelY, panelWidth, 150 + (detailRowCount * 28), 24);
  context.fillStyle = "rgba(5, 11, 20, 0.78)";
  context.fill();
  context.strokeStyle = "rgba(75, 240, 177, 0.18)";
  context.stroke();

  drawRoundedRect(context, 76 + panelWidth, panelY, panelWidth, 150 + (detailRowCount * 28), 24);
  context.fillStyle = "rgba(5, 11, 20, 0.78)";
  context.fill();
  context.strokeStyle = "rgba(75, 240, 177, 0.18)";
  context.stroke();

  context.fillStyle = "#4bf0b1";
  context.font = "700 22px Orbitron, Arial, sans-serif";
  context.fillText("Scoring Rules", 88, panelY + 42);
  context.fillText("Killboard Snapshot", 108 + panelWidth, panelY + 42);

  context.fillStyle = "rgba(237, 244, 255, 0.74)";
  context.font = "600 16px Space Grotesk, Arial, sans-serif";
  (rules.length ? rules : [{ position: 1, points: 15 }]).forEach((rule, index) => {
    context.fillText(`Position ${rule.position}: ${rule.points} pts`, 88, panelY + 82 + (index * 28));
  });

  (topFraggers.length ? topFraggers : [{ player_name: "No player stats yet", kills: 0 }]).forEach((player, index) => {
    context.fillText(`${player.player_name}: ${Number(player.kills || 0)} kills`, 108 + panelWidth, panelY + 82 + (index * 28));
  });

  const link = document.createElement("a");
  link.download = `${String(tournament?.name || "points-table").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function TournamentPointsTable() {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadPointsTable();
  }, [id, token]);

  async function loadPointsTable() {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(`/tournaments/${id}/points-table`, { token });
      setData(response || null);
    } catch (requestErrorValue) {
      setData(null);
      setError(requestErrorValue.message);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!data?.tournament) {
      return;
    }

    try {
      exportPointsTableImage(data);
      setNotice("Points table exported as an image.");
    } catch (exportError) {
      setNotice("");
      setError(exportError.message);
    }
  }

  const tournament = data?.tournament || null;
  const leaderboard = data?.leaderboard || [];
  const stats = data?.stats || null;
  const summary = stats?.summary || {};
  const topTeam = leaderboard[0] || null;
  const topFragger = stats?.topFraggers?.[0] || null;

  const summaryCards = useMemo(() => ([
    { label: "Approved Teams", value: Number(tournament?.joined_teams || 0), icon: Users },
    { label: "Matches Logged", value: Number(summary.total_matches || 0), icon: Medal },
    { label: "Total Kills", value: Number(summary.total_kills || 0), icon: Crosshair },
    { label: "Tracked Players", value: Number(summary.total_players || 0), icon: BarChart3 }
  ]), [summary, tournament]);

  return (
    <PageWrapper className="stack-layout">
      <HeroMediaBanner
        page="leaderboard"
        eyebrow="Tournament Points Table"
        title={tournament?.name ? `${tournament.name} Standings` : "Tournament Points Table"}
        description="A dedicated points table page for this tournament, updated automatically every time a new result is entered."
      />

      {loading ? <section className="page-card"><p>Loading points table...</p></section> : null}
      {error ? <section className="page-card"><div className="form-message form-message--error">{error}</div></section> : null}
      {notice ? <section className="page-card"><div className="form-message form-message--success">{notice}</div></section> : null}

      {!loading && tournament ? (
        <>
          <section className="page-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Tournament Snapshot</span>
                <h2>{tournament.name}</h2>
              </div>
              <div className="button-row">
                <ActionButton iconName="stats" onClick={handleExport}>Export as Image</ActionButton>
                <ActionButton to={`/stats?tournament=${tournament.id}`} iconName="stats" className="nav-button nav-button--ghost">Open Analytics</ActionButton>
                <ActionButton to={`/tournaments/${tournament.id}/register`} iconName="tournaments" className="nav-button nav-button--ghost">Registration Form</ActionButton>
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
                <span>Roster: {tournament.min_players}-{tournament.max_players_per_team} players</span>
              </div>
              <div className="metric-pill">
                <span>Approval: {tournament.require_admin_approval ? "Manual review" : "Auto-approved"}</span>
              </div>
            </div>
            <div className="stats-grid">
              {summaryCards.map(({ label, value, icon: Icon }) => (
                <article key={label} className="page-card stat-card">
                  <div className="card-heading-row">
                    <span className="eyebrow">{label}</span>
                    <Icon className="card-icon" size={20} />
                  </div>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="page-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Standings</span>
                <h2>Beautiful Points Table</h2>
              </div>
              <p>Standings are recalculated automatically from the tournament point system each time admins add or edit a match result.</p>
            </div>
            <div className="table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>Matches</th>
                    <th>Kills</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length ? leaderboard.map((team, index) => (
                    <tr key={team.id} className="leaderboard-row">
                      <td>#{index + 1}</td>
                      <td><TeamIdentity name={team.name} logoUrl={team.logo_url} /></td>
                      <td>{team.matches_played}</td>
                      <td>{team.kills}</td>
                      <td>{team.points}</td>
                    </tr>
                  )) : (
                    <tr className="leaderboard-row">
                      <td colSpan="5">No standings yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="entity-grid">
            <article className="page-card entity-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Top Team</span>
                  <h3>Current Leader</h3>
                </div>
                <Trophy className="card-icon" size={24} />
              </div>
              {topTeam ? (
                <>
                  <TeamIdentity name={topTeam.name} logoUrl={topTeam.logo_url} />
                  <p>Matches: {topTeam.matches_played}</p>
                  <p>Kills: {topTeam.kills}</p>
                  <p>Points: {topTeam.points}</p>
                </>
              ) : (
                <p>No approved team has scored yet.</p>
              )}
            </article>

            <article className="page-card entity-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Top Fragger</span>
                  <h3>Killboard Leader</h3>
                </div>
                <Crosshair className="card-icon" size={24} />
              </div>
              {topFragger ? (
                <>
                  <TeamIdentity name={topFragger.player_name} logoUrl={topFragger.logo_url} subtitle={topFragger.team_name} />
                  <p>Total kills: {topFragger.kills}</p>
                  <p>Average kills: {formatAverage(topFragger.average_kills)}</p>
                  <p>Best match: {topFragger.best_match_kills}</p>
                </>
              ) : (
                <p>No player kill data has been entered yet.</p>
              )}
            </article>

            <article className="page-card entity-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Custom Rules</span>
                  <h3>Placement Points</h3>
                </div>
                <Download className="card-icon" size={24} />
              </div>
              {(tournament.points_system || []).length ? (
                (tournament.points_system || []).map((rule) => (
                  <p key={rule.position}>Position {rule.position}: {rule.points} pts</p>
                ))
              ) : (
                <p>Using the platform default point system.</p>
              )}
            </article>
          </section>
        </>
      ) : null}
    </PageWrapper>
  );
}

export default TournamentPointsTable;
