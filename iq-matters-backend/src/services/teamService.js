const { pool, withTransaction } = require("../config/db");
const { HttpError } = require("../utils/http");
const { syncCompetitionState } = require("./competitionStateService");

function normalizePlayers(players) {
  if (!Array.isArray(players)) {
    return [];
  }

  return [...new Set(players.map((player) => String(player || "").trim()).filter(Boolean))];
}

async function getTeamWithPlayers(connection, teamId) {
  const [teamRows] = await connection.query(
    `
      SELECT id, name, leader_id, total_points, total_kills, matches_played
      FROM teams
      WHERE id = ?
      LIMIT 1
    `,
    [teamId]
  );

  if (!teamRows.length) {
    return null;
  }

  const [playerRows] = await connection.query(
    "SELECT id, team_id, player_name, player_uid FROM players WHERE team_id = ? ORDER BY id ASC",
    [teamId]
  );

  return {
    team: teamRows[0],
    players: playerRows
  };
}

async function createTeam({ team_name, leader_id, players }, actingUser) {
  if (!actingUser) {
    throw new HttpError(401, "Authentication required");
  }

  const teamName = String(team_name || "").trim();
  const leaderId = Number(leader_id || actingUser.id);
  const normalizedPlayers = normalizePlayers(players);

  if (!teamName) {
    throw new HttpError(400, "Team name is required");
  }

  if (!normalizedPlayers.length) {
    throw new HttpError(400, "At least one player UID is required");
  }

  if (actingUser.role !== "admin" && leaderId !== Number(actingUser.id)) {
    throw new HttpError(403, "You can only create a team for your own account");
  }

  const [leaderRows] = await pool.query(
    "SELECT id, team_id FROM users WHERE id = ? LIMIT 1",
    [leaderId]
  );

  const leader = leaderRows[0];

  if (!leader) {
    throw new HttpError(404, "Leader account not found");
  }

  if (leader.team_id) {
    throw new HttpError(409, "This account already belongs to a team");
  }

  return withTransaction(async (connection) => {
    const [teamResult] = await connection.query(
      `
        INSERT INTO teams (name, leader_id, total_points, total_kills, matches_played)
        VALUES (?, ?, 0, 0, 0)
      `,
      [teamName, leaderId]
    );

    const teamId = teamResult.insertId;

    for (let index = 0; index < normalizedPlayers.length; index += 1) {
      const playerName = `Player ${index + 1}`;

      await connection.query(
        "INSERT INTO players (team_id, player_name, player_uid) VALUES (?, ?, ?)",
        [teamId, playerName, normalizedPlayers[index]]
      );
    }

    await connection.query(
      "UPDATE users SET team_id = ? WHERE id = ?",
      [teamId, leaderId]
    );

    return getTeamWithPlayers(connection, teamId);
  });
}

async function updateTeam(teamId, payload) {
  const teamIdNumber = Number(teamId);
  const teamName = Object.prototype.hasOwnProperty.call(payload, "name") ? String(payload.name || "").trim() : null;
  const nextLeaderId = Object.prototype.hasOwnProperty.call(payload, "leader_id") ? Number(payload.leader_id) : null;
  const players = Object.prototype.hasOwnProperty.call(payload, "players") ? normalizePlayers(payload.players) : null;

  return withTransaction(async (connection) => {
    const existingTeam = await getTeamWithPlayers(connection, teamIdNumber);

    if (!existingTeam) {
      throw new HttpError(404, "Team not found");
    }

    if (teamName !== null) {
      if (!teamName) {
        throw new HttpError(400, "Team name is required");
      }

      await connection.query(
        "UPDATE teams SET name = ? WHERE id = ?",
        [teamName, teamIdNumber]
      );
    }

    if (nextLeaderId !== null) {
      const [leaderRows] = await connection.query(
        "SELECT id, team_id FROM users WHERE id = ? LIMIT 1",
        [nextLeaderId]
      );

      const leader = leaderRows[0];

      if (!leader) {
        throw new HttpError(404, "Leader account not found");
      }

      if (leader.team_id && Number(leader.team_id) !== teamIdNumber) {
        throw new HttpError(409, "This account already belongs to another team");
      }

      await connection.query(
        "UPDATE users SET team_id = NULL WHERE id = ? AND team_id = ?",
        [existingTeam.team.leader_id, teamIdNumber]
      );

      await connection.query(
        "UPDATE users SET team_id = ? WHERE id = ?",
        [teamIdNumber, nextLeaderId]
      );

      await connection.query(
        "UPDATE teams SET leader_id = ? WHERE id = ?",
        [nextLeaderId, teamIdNumber]
      );
    }

    if (players !== null) {
      if (!players.length) {
        throw new HttpError(400, "At least one player UID is required");
      }

      await connection.query("DELETE FROM players WHERE team_id = ?", [teamIdNumber]);

      for (let index = 0; index < players.length; index += 1) {
        await connection.query(
          "INSERT INTO players (team_id, player_name, player_uid) VALUES (?, ?, ?)",
          [teamIdNumber, `Player ${index + 1}`, players[index]]
        );
      }
    }

    return getTeamWithPlayers(connection, teamIdNumber);
  });
}

async function deleteTeam(teamId) {
  const teamIdNumber = Number(teamId);

  return withTransaction(async (connection) => {
    const existingTeam = await getTeamWithPlayers(connection, teamIdNumber);

    if (!existingTeam) {
      throw new HttpError(404, "Team not found");
    }

    await connection.query("DELETE FROM results WHERE team_id = ?", [teamIdNumber]);
    await connection.query("DELETE FROM match_teams WHERE team_id = ?", [teamIdNumber]);
    await connection.query("DELETE FROM tournament_teams WHERE team_id = ?", [teamIdNumber]);
    await connection.query("DELETE FROM players WHERE team_id = ?", [teamIdNumber]);
    await connection.query("UPDATE users SET team_id = NULL WHERE team_id = ?", [teamIdNumber]);
    await connection.query("DELETE FROM teams WHERE id = ?", [teamIdNumber]);

    await syncCompetitionState(connection);

    return existingTeam.team;
  });
}

async function getTeamByUserId(userId) {
  const [rows] = await pool.query(
    `
      SELECT teams.id, teams.name, teams.leader_id, teams.total_points, teams.total_kills, teams.matches_played
      FROM teams
      JOIN users ON users.team_id = teams.id
      WHERE users.id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

async function getPlayersByTeamId(teamId) {
  const [rows] = await pool.query(
    `
      SELECT id, team_id, player_name, player_uid
      FROM players
      WHERE team_id = ?
      ORDER BY id ASC
    `,
    [teamId]
  );

  return rows;
}

async function getAdminTeams() {
  const [rows] = await pool.query(
    `
      SELECT
        teams.id,
        teams.name,
        teams.leader_id,
        teams.total_points,
        teams.total_kills,
        teams.matches_played,
        users.name AS leader_name,
        users.email AS leader_email,
        COUNT(DISTINCT players.id) AS player_count,
        COUNT(DISTINCT tournament_teams.tournament_id) AS joined_tournaments
      FROM teams
      LEFT JOIN users ON users.id = teams.leader_id
      LEFT JOIN players ON players.team_id = teams.id
      LEFT JOIN tournament_teams ON tournament_teams.team_id = teams.id
      GROUP BY teams.id
      ORDER BY teams.total_points DESC, teams.total_kills DESC, teams.id ASC
    `
  );

  return rows;
}

module.exports = {
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamByUserId,
  getPlayersByTeamId,
  getAdminTeams
};
