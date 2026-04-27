const { pool } = require("../config/db");
const { HttpError } = require("../utils/http");

function normalizeTournamentId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const tournamentId = Number(value);

  if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
    throw new HttpError(400, "tournament_id must be a positive number");
  }

  return tournamentId;
}

async function ensureTournamentExists(tournamentId) {
  if (!tournamentId) {
    return null;
  }

  const [rows] = await pool.query(
    "SELECT id, name FROM tournaments WHERE id = ? LIMIT 1",
    [tournamentId]
  );

  if (!rows.length) {
    throw new HttpError(404, "Tournament not found");
  }

  return rows[0];
}

async function getGlobalSummary() {
  const [rows] = await pool.query(
    `
      SELECT
        (SELECT COUNT(*) FROM teams) AS total_teams,
        (SELECT COUNT(*) FROM players) AS total_players,
        (SELECT COUNT(*) FROM matches) AS total_matches,
        (SELECT COALESCE(SUM(kills), 0) FROM results) AS total_kills
    `
  );

  const row = rows[0] || {};

  return {
    total_teams: Number(row.total_teams || 0),
    total_players: Number(row.total_players || 0),
    total_matches: Number(row.total_matches || 0),
    total_kills: Number(row.total_kills || 0)
  };
}

async function getTournamentSummary(tournamentId) {
  const [rows] = await pool.query(
    `
      SELECT
        (
          SELECT COUNT(*)
          FROM tournament_teams
          WHERE tournament_id = ? AND COALESCE(disqualified, 0) = 0
        ) AS total_teams,
        (
          SELECT COUNT(*)
          FROM players
          JOIN tournament_teams ON tournament_teams.team_id = players.team_id
          WHERE tournament_teams.tournament_id = ? AND COALESCE(tournament_teams.disqualified, 0) = 0
        ) AS total_players,
        (
          SELECT COUNT(*)
          FROM matches
          WHERE tournament_id = ?
        ) AS total_matches,
        (
          SELECT COALESCE(SUM(results.kills), 0)
          FROM results
          JOIN matches ON matches.id = results.match_id
          JOIN tournament_teams
            ON tournament_teams.tournament_id = matches.tournament_id
            AND tournament_teams.team_id = results.team_id
          WHERE matches.tournament_id = ? AND COALESCE(tournament_teams.disqualified, 0) = 0
        ) AS total_kills
    `,
    [tournamentId, tournamentId, tournamentId, tournamentId]
  );

  const row = rows[0] || {};

  return {
    total_teams: Number(row.total_teams || 0),
    total_players: Number(row.total_players || 0),
    total_matches: Number(row.total_matches || 0),
    total_kills: Number(row.total_kills || 0)
  };
}

async function getGlobalTeamStats() {
  const [rows] = await pool.query(
    `
      SELECT
        teams.id,
        teams.name,
        teams.logo_url,
        MAX(COALESCE(stats.total_points, 0)) AS points,
        MAX(COALESCE(stats.total_kills, 0)) AS kills,
        MAX(COALESCE(stats.matches_played, 0)) AS matches_played,
        COUNT(DISTINCT players.id) AS player_count
      FROM teams
      LEFT JOIN players ON players.team_id = teams.id
      LEFT JOIN (
        SELECT
          team_id,
          COALESCE(SUM(matches_played), 0) AS matches_played,
          COALESCE(SUM(total_kills), 0) AS total_kills,
          COALESCE(SUM(total_points), 0) AS total_points
        FROM tournament_team_stats
        GROUP BY team_id
      ) stats ON stats.team_id = teams.id
      GROUP BY teams.id
      ORDER BY points DESC, kills DESC, teams.name ASC
    `
  );

  return rows.map((row) => ({
    ...row,
    points: Number(row.points || 0),
    kills: Number(row.kills || 0),
    matches_played: Number(row.matches_played || 0),
    player_count: Number(row.player_count || 0)
  }));
}

async function getTournamentTeamStats(tournamentId) {
  const [rows] = await pool.query(
    `
      SELECT
        teams.id,
        teams.name,
        teams.logo_url,
        MAX(COALESCE(stats.total_points, 0)) AS points,
        MAX(COALESCE(stats.total_kills, 0)) AS kills,
        MAX(COALESCE(stats.matches_played, 0)) AS matches_played,
        COUNT(DISTINCT players.id) AS player_count
      FROM tournament_teams
      JOIN teams ON teams.id = tournament_teams.team_id
      LEFT JOIN players ON players.team_id = teams.id
      LEFT JOIN (
        SELECT
          tournament_id,
          team_id,
          COALESCE(SUM(matches_played), 0) AS matches_played,
          COALESCE(SUM(total_kills), 0) AS total_kills,
          COALESCE(SUM(total_points), 0) AS total_points
        FROM tournament_team_stats
        GROUP BY tournament_id, team_id
      ) stats
        ON stats.tournament_id = tournament_teams.tournament_id
        AND stats.team_id = tournament_teams.team_id
      WHERE tournament_teams.tournament_id = ? AND COALESCE(tournament_teams.disqualified, 0) = 0
      GROUP BY teams.id
      ORDER BY points DESC, kills DESC, teams.name ASC
    `,
    [tournamentId]
  );

  return rows.map((row) => ({
    ...row,
    points: Number(row.points || 0),
    kills: Number(row.kills || 0),
    matches_played: Number(row.matches_played || 0),
    player_count: Number(row.player_count || 0)
  }));
}

async function getGlobalPlayerStats() {
  const [rows] = await pool.query(
    `
      SELECT
        players.id,
        players.team_id,
        players.player_name,
        players.player_uid,
        players.logo_url,
        teams.name AS team_name,
        teams.logo_url AS team_logo_url,
        COALESCE(stats.kills, 0) AS kills,
        COALESCE(stats.matches_played, 0) AS matches_played,
        COALESCE(stats.average_kills, 0) AS average_kills,
        COALESCE(stats.best_match_kills, 0) AS best_match_kills
      FROM players
      JOIN teams ON teams.id = players.team_id
      LEFT JOIN (
        SELECT
          player_id,
          COALESCE(SUM(kills), 0) AS kills,
          COUNT(DISTINCT match_id) AS matches_played,
          COALESCE(AVG(kills), 0) AS average_kills,
          COALESCE(MAX(kills), 0) AS best_match_kills
        FROM player_match_stats
        GROUP BY player_id
      ) stats ON stats.player_id = players.id
      ORDER BY kills DESC, best_match_kills DESC, players.player_name ASC
    `
  );

  return rows.map((row) => ({
    ...row,
    kills: Number(row.kills || 0),
    matches_played: Number(row.matches_played || 0),
    average_kills: Number(Number(row.average_kills || 0).toFixed(2)),
    best_match_kills: Number(row.best_match_kills || 0)
  }));
}

async function getTournamentPlayerStats(tournamentId) {
  const [rows] = await pool.query(
    `
      SELECT
        players.id,
        players.team_id,
        players.player_name,
        players.player_uid,
        players.logo_url,
        teams.name AS team_name,
        teams.logo_url AS team_logo_url,
        COALESCE(stats.kills, 0) AS kills,
        COALESCE(stats.matches_played, 0) AS matches_played,
        COALESCE(stats.average_kills, 0) AS average_kills,
        COALESCE(stats.best_match_kills, 0) AS best_match_kills
      FROM players
      JOIN teams ON teams.id = players.team_id
      JOIN tournament_teams
        ON tournament_teams.team_id = teams.id
        AND tournament_teams.tournament_id = ?
        AND COALESCE(tournament_teams.disqualified, 0) = 0
      LEFT JOIN (
        SELECT
          player_match_stats.player_id,
          COALESCE(SUM(player_match_stats.kills), 0) AS kills,
          COUNT(DISTINCT player_match_stats.match_id) AS matches_played,
          COALESCE(AVG(player_match_stats.kills), 0) AS average_kills,
          COALESCE(MAX(player_match_stats.kills), 0) AS best_match_kills
        FROM player_match_stats
        JOIN matches ON matches.id = player_match_stats.match_id
        WHERE matches.tournament_id = ?
        GROUP BY player_match_stats.player_id
      ) stats ON stats.player_id = players.id
      ORDER BY kills DESC, best_match_kills DESC, players.player_name ASC
    `,
    [tournamentId, tournamentId]
  );

  return rows.map((row) => ({
    ...row,
    kills: Number(row.kills || 0),
    matches_played: Number(row.matches_played || 0),
    average_kills: Number(Number(row.average_kills || 0).toFixed(2)),
    best_match_kills: Number(row.best_match_kills || 0)
  }));
}

async function getStatsOverview(tournamentIdInput) {
  const tournamentId = normalizeTournamentId(tournamentIdInput);
  const tournament = await ensureTournamentExists(tournamentId);
  const [summary, teamStats, playerStats] = await Promise.all([
    tournamentId ? getTournamentSummary(tournamentId) : getGlobalSummary(),
    tournamentId ? getTournamentTeamStats(tournamentId) : getGlobalTeamStats(),
    tournamentId ? getTournamentPlayerStats(tournamentId) : getGlobalPlayerStats()
  ]);

  return {
    tournament,
    summary,
    teamStats,
    playerStats,
    topFraggers: playerStats.filter((player) => player.kills > 0).slice(0, 5),
    topTeams: teamStats.slice(0, 5)
  };
}

module.exports = {
  getStatsOverview
};
