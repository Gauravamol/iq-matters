const { pool } = require("../config/db");
const { HttpError } = require("../utils/http");

function parseNumeric(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

async function listTournaments(viewerTeamId) {
  const [rows] = await pool.query(
    `
      SELECT
        tournaments.id,
        tournaments.name,
        tournaments.date,
        tournaments.entry_fee,
        tournaments.prize_pool,
        tournaments.max_teams,
        tournaments.status,
        COUNT(DISTINCT tournament_teams.team_id) AS joined_teams,
        MAX(CASE WHEN tournament_teams.team_id = ? THEN 1 ELSE 0 END) AS is_joined
      FROM tournaments
      LEFT JOIN tournament_teams ON tournament_teams.tournament_id = tournaments.id
      GROUP BY tournaments.id
      ORDER BY
        CASE tournaments.status
          WHEN 'live' THEN 0
          WHEN 'upcoming' THEN 1
          ELSE 2
        END,
        tournaments.date IS NULL,
        tournaments.date ASC,
        tournaments.id DESC
    `,
    [viewerTeamId || -1]
  );

  return rows.map((row) => ({
    ...row,
    joined_teams: Number(row.joined_teams || 0),
    is_joined: Boolean(row.is_joined)
  }));
}

async function createTournament(payload) {
  const name = String(payload.name || "").trim();
  const date = payload.date || null;
  const entryFee = parseNumeric(payload.entry_fee, 0);
  const prizePool = parseNumeric(payload.prize_pool, 0);
  const maxTeams = parseNumeric(payload.max_teams, 0);
  const status = String(payload.status || "upcoming").trim();

  if (!name) {
    throw new HttpError(400, "Tournament name is required");
  }

  if (!maxTeams || maxTeams < 1) {
    throw new HttpError(400, "Max teams must be at least 1");
  }

  if (!["upcoming", "live", "completed"].includes(status)) {
    throw new HttpError(400, "Tournament status must be upcoming, live, or completed");
  }

  const [result] = await pool.query(
    `
      INSERT INTO tournaments (name, date, entry_fee, prize_pool, max_teams, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [name, date, entryFee, prizePool, maxTeams, status]
  );

  const [rows] = await pool.query(
    "SELECT * FROM tournaments WHERE id = ? LIMIT 1",
    [result.insertId]
  );

  return rows[0];
}

async function updateTournament(tournamentId, payload) {
  const allowedFields = {
    name: (value) => String(value || "").trim(),
    date: (value) => (value === "" ? null : value || null),
    entry_fee: (value) => parseNumeric(value, 0),
    prize_pool: (value) => parseNumeric(value, 0),
    max_teams: (value) => parseNumeric(value, 0),
    status: (value) => String(value || "upcoming").trim()
  };

  const updates = [];
  const values = [];

  Object.keys(allowedFields).forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates.push(`${field} = ?`);
      values.push(allowedFields[field](payload[field]));
    }
  });

  if (!updates.length) {
    throw new HttpError(400, "No tournament updates were provided");
  }

  values.push(Number(tournamentId));

  const [result] = await pool.query(
    `UPDATE tournaments SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  if (!result.affectedRows) {
    throw new HttpError(404, "Tournament not found");
  }

  const [rows] = await pool.query(
    "SELECT * FROM tournaments WHERE id = ? LIMIT 1",
    [Number(tournamentId)]
  );

  return rows[0];
}

async function deleteTournament(tournamentId) {
  const { withTransaction } = require("../config/db");
  const { syncCompetitionState } = require("./competitionStateService");
  const tournamentIdNumber = Number(tournamentId);

  return withTransaction(async (connection) => {
    const [tournamentRows] = await connection.query(
      "SELECT * FROM tournaments WHERE id = ? LIMIT 1",
      [tournamentIdNumber]
    );

    const tournament = tournamentRows[0];

    if (!tournament) {
      throw new HttpError(404, "Tournament not found");
    }

    await connection.query(
      `
        DELETE results
        FROM results
        INNER JOIN matches ON matches.id = results.match_id
        WHERE matches.tournament_id = ?
      `,
      [tournamentIdNumber]
    );

    await connection.query(
      `
        DELETE match_teams
        FROM match_teams
        INNER JOIN matches ON matches.id = match_teams.match_id
        WHERE matches.tournament_id = ?
      `,
      [tournamentIdNumber]
    );

    await connection.query(
      "DELETE FROM matches WHERE tournament_id = ?",
      [tournamentIdNumber]
    );

    await connection.query(
      "DELETE FROM tournament_teams WHERE tournament_id = ?",
      [tournamentIdNumber]
    );

    await connection.query(
      "DELETE FROM tournaments WHERE id = ?",
      [tournamentIdNumber]
    );

    await syncCompetitionState(connection);

    return tournament;
  });
}

async function joinTournament({ tournament_id, team_id }, actingUser) {
  if (!actingUser) {
    throw new HttpError(401, "Authentication required");
  }

  const tournamentId = Number(tournament_id);
  const requestedTeamId = Number(team_id || actingUser.team_id);
  const resolvedTeamId = actingUser.role === "admin" ? requestedTeamId : Number(actingUser.team_id);

  if (!tournamentId || !resolvedTeamId) {
    throw new HttpError(400, "Tournament and team are required");
  }

  if (actingUser.role !== "admin" && resolvedTeamId !== Number(actingUser.team_id)) {
    throw new HttpError(403, "You can only register your own team");
  }

  const [tournamentRows] = await pool.query(
    "SELECT id, max_teams FROM tournaments WHERE id = ? LIMIT 1",
    [tournamentId]
  );

  const tournament = tournamentRows[0];

  if (!tournament) {
    throw new HttpError(404, "Tournament not found");
  }

  const [teamRows] = await pool.query(
    "SELECT id FROM teams WHERE id = ? LIMIT 1",
    [resolvedTeamId]
  );

  if (!teamRows.length) {
    throw new HttpError(404, "Team not found");
  }

  const [duplicateRows] = await pool.query(
    "SELECT 1 FROM tournament_teams WHERE tournament_id = ? AND team_id = ? LIMIT 1",
    [tournamentId, resolvedTeamId]
  );

  if (duplicateRows.length) {
    throw new HttpError(409, "Team is already registered for this tournament");
  }

  const [countRows] = await pool.query(
    "SELECT COUNT(*) AS count FROM tournament_teams WHERE tournament_id = ?",
    [tournamentId]
  );

  if (Number(tournament.max_teams || 0) && Number(countRows[0].count) >= Number(tournament.max_teams)) {
    throw new HttpError(409, "Tournament has reached its team limit");
  }

  await pool.query(
    "INSERT INTO tournament_teams (tournament_id, team_id) VALUES (?, ?)",
    [tournamentId, resolvedTeamId]
  );

  return {
    tournament_id: tournamentId,
    team_id: resolvedTeamId
  };
}

async function getTournamentRegistrations(tournamentId) {
  const [rows] = await pool.query(
    `
      SELECT
        teams.id,
        teams.name,
        teams.total_points,
        teams.total_kills,
        teams.matches_played,
        users.name AS leader_name,
        users.email AS leader_email,
        COUNT(players.id) AS player_count
      FROM tournament_teams
      JOIN teams ON teams.id = tournament_teams.team_id
      LEFT JOIN users ON users.id = teams.leader_id
      LEFT JOIN players ON players.team_id = teams.id
      WHERE tournament_teams.tournament_id = ?
      GROUP BY teams.id
      ORDER BY teams.total_points DESC, teams.total_kills DESC, teams.name ASC
    `,
    [Number(tournamentId)]
  );

  return rows;
}

async function getTournamentLeaderboard(tournamentId) {
  const [rows] = await pool.query(
    `
      SELECT
        teams.id,
        teams.name,
        COALESCE(SUM(match_results.kills), 0) AS kills,
        COALESCE(SUM(match_results.points), 0) AS points,
        COUNT(match_results.id) AS matches_played
      FROM tournament_teams
      JOIN teams ON teams.id = tournament_teams.team_id
      LEFT JOIN match_results
        ON match_results.team_id = teams.id
        AND match_results.tournament_id = tournament_teams.tournament_id
      WHERE tournament_teams.tournament_id = ?
      GROUP BY teams.id
      ORDER BY points DESC, kills DESC, teams.name ASC
    `,
    [Number(tournamentId)]
  );

  return rows;
}

async function getGlobalLeaderboard() {
  const [rows] = await pool.query(
    `
      SELECT id, name, total_points, total_kills, matches_played
      FROM teams
      ORDER BY total_points DESC, total_kills DESC, name ASC
    `
  );

  return rows;
}

module.exports = {
  listTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  joinTournament,
  getTournamentRegistrations,
  getTournamentLeaderboard,
  getGlobalLeaderboard
};
