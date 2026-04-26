const { pool, withTransaction } = require("../config/db");
const { HttpError } = require("../utils/http");
const { syncCompetitionState } = require("./competitionStateService");

function normalizeLogoUrl(value) {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || null;
}

function normalizePlayerInput(player, index) {
  if (typeof player === "string" || typeof player === "number") {
    const playerUid = String(player || "").trim();

    if (!playerUid) {
      return null;
    }

    return {
      player_name: `Player ${index + 1}`,
      player_uid: playerUid,
      logo_url: null
    };
  }

  if (!player || typeof player !== "object") {
    return null;
  }

  const playerUid = String(player.player_uid || player.uid || "").trim();

  if (!playerUid) {
    return null;
  }

  return {
    player_name: String(player.player_name || player.name || `Player ${index + 1}`).trim() || `Player ${index + 1}`,
    player_uid: playerUid,
    logo_url: normalizeLogoUrl(player.logo_url || player.logo)
  };
}

function normalizePlayers(players) {
  if (!Array.isArray(players)) {
    return [];
  }

  const seenPlayerUids = new Set();
  const normalizedPlayers = [];

  players.forEach((player, index) => {
    const normalizedPlayer = normalizePlayerInput(player, index);

    if (!normalizedPlayer) {
      return;
    }

    const normalizedKey = normalizedPlayer.player_uid.toLowerCase();

    if (seenPlayerUids.has(normalizedKey)) {
      return;
    }

    seenPlayerUids.add(normalizedKey);
    normalizedPlayers.push(normalizedPlayer);
  });

  return normalizedPlayers;
}

async function getTeamWithPlayers(connection, teamId) {
  const [teamRows] = await connection.query(
    `
      SELECT id, name, logo_url, leader_id, total_points, total_kills, matches_played
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
    "SELECT id, team_id, player_name, player_uid, logo_url FROM players WHERE team_id = ? ORDER BY id ASC",
    [teamId]
  );

  return {
    team: teamRows[0],
    players: playerRows
  };
}

async function createTeam({ team_name, leader_id, team_logo_url, tournament_id, players }, actingUser) {
  if (!actingUser) {
    throw new HttpError(401, "Authentication required");
  }

  const teamName = String(team_name || "").trim();
  const leaderId = leader_id === undefined || leader_id === null || leader_id === ""
    ? Number(actingUser.id)
    : Number(leader_id);
  const teamLogoUrl = normalizeLogoUrl(team_logo_url);
  const tournamentId = tournament_id ? Number(tournament_id) : null;
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
        INSERT INTO teams (name, logo_url, leader_id, total_points, total_kills, matches_played)
        VALUES (?, ?, ?, 0, 0, 0)
      `,
      [teamName, teamLogoUrl, leaderId]
    );

    const teamId = teamResult.insertId;

    for (let index = 0; index < normalizedPlayers.length; index += 1) {
      const player = normalizedPlayers[index];

      await connection.query(
        "INSERT INTO players (team_id, player_name, player_uid, logo_url) VALUES (?, ?, ?, ?)",
        [teamId, player.player_name, player.player_uid, player.logo_url]
      );
    }

    await connection.query(
      "UPDATE users SET team_id = ? WHERE id = ?",
      [teamId, leaderId]
    );

    if (tournamentId) {
      const { registerTeamForTournament } = require("./tournamentService");
      await registerTeamForTournament(connection, { tournamentId, teamId });
    }

    return getTeamWithPlayers(connection, teamId);
  });
}

async function updateTeam(teamId, payload) {
  const teamIdNumber = Number(teamId);
  const teamName = Object.prototype.hasOwnProperty.call(payload, "name") ? String(payload.name || "").trim() : null;
  const teamLogoUrl = Object.prototype.hasOwnProperty.call(payload, "logo_url")
    ? normalizeLogoUrl(payload.logo_url)
    : (Object.prototype.hasOwnProperty.call(payload, "team_logo_url") ? normalizeLogoUrl(payload.team_logo_url) : null);
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

    if (teamLogoUrl !== null || Object.prototype.hasOwnProperty.call(payload, "logo_url") || Object.prototype.hasOwnProperty.call(payload, "team_logo_url")) {
      await connection.query(
        "UPDATE teams SET logo_url = ? WHERE id = ?",
        [teamLogoUrl, teamIdNumber]
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
        const player = players[index];
        await connection.query(
          "INSERT INTO players (team_id, player_name, player_uid, logo_url) VALUES (?, ?, ?, ?)",
          [teamIdNumber, player.player_name, player.player_uid, player.logo_url]
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

    await connection.query("DELETE FROM player_match_stats WHERE team_id = ?", [teamIdNumber]);
    await connection.query("DELETE FROM results WHERE team_id = ?", [teamIdNumber]);
    await connection.query("DELETE FROM match_teams WHERE team_id = ?", [teamIdNumber]);
    await connection.query("DELETE FROM tournament_teams WHERE team_id = ?", [teamIdNumber]);
    await connection.query("DELETE FROM tournament_registration_requests WHERE submitted_team_id = ? OR approved_team_id = ?", [teamIdNumber, teamIdNumber]);
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
      SELECT teams.id, teams.name, teams.logo_url, teams.leader_id, teams.total_points, teams.total_kills, teams.matches_played
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
      SELECT id, team_id, player_name, player_uid, logo_url
      FROM players
      WHERE team_id = ?
      ORDER BY id ASC
    `,
    [teamId]
  );

  return rows;
}

async function getTeamProfile(teamId) {
  const teamIdNumber = Number(teamId);

  if (!teamIdNumber) {
    throw new HttpError(400, "Team ID is required");
  }

  const [teamRows] = await pool.query(
    `
      SELECT id, name, logo_url, leader_id
      FROM teams
      WHERE id = ?
      LIMIT 1
    `,
    [teamIdNumber]
  );

  const team = teamRows[0];

  if (!team) {
    throw new HttpError(404, "Team not found");
  }

  const [overallRows] = await pool.query(
    `
      SELECT
        COALESCE(SUM(total_points), 0) AS total_points,
        COALESCE(SUM(total_kills), 0) AS total_kills,
        COALESCE(SUM(matches_played), 0) AS matches_played
      FROM tournament_team_stats
      WHERE team_id = ?
    `,
    [teamIdNumber]
  );

  const [placementRows] = await pool.query(
    `
      SELECT AVG(position) AS average_placement
      FROM results
      WHERE team_id = ?
    `,
    [teamIdNumber]
  );

  const [historyRows] = await pool.query(
    `
      SELECT
        ranked.tournament_id,
        tournaments.name AS tournament_name,
        ranked.placement_rank AS tournament_rank,
        ranked.matches_played,
        ranked.total_kills,
        ranked.total_points
      FROM (
        SELECT
          stats.tournament_id,
          stats.team_id,
          stats.matches_played,
          stats.total_kills,
          stats.total_points,
          ROW_NUMBER() OVER (
            PARTITION BY stats.tournament_id
            ORDER BY stats.total_points DESC, stats.total_kills DESC, teams.name ASC
          ) AS placement_rank
        FROM (
          SELECT
            registrations.tournament_id,
            registrations.team_id,
            COALESCE(team_stats.matches_played, 0) AS matches_played,
            COALESCE(team_stats.total_kills, 0) AS total_kills,
            COALESCE(team_stats.total_points, 0) AS total_points
          FROM (
            SELECT DISTINCT tournament_id, team_id
            FROM tournament_teams
          ) registrations
          LEFT JOIN (
            SELECT
              tournament_id,
              team_id,
              COALESCE(SUM(matches_played), 0) AS matches_played,
              COALESCE(SUM(total_kills), 0) AS total_kills,
              COALESCE(SUM(total_points), 0) AS total_points
            FROM tournament_team_stats
            GROUP BY tournament_id, team_id
          ) team_stats
            ON team_stats.tournament_id = registrations.tournament_id
            AND team_stats.team_id = registrations.team_id
        ) stats
        JOIN teams ON teams.id = stats.team_id
      ) ranked
      JOIN tournaments ON tournaments.id = ranked.tournament_id
      WHERE ranked.team_id = ?
      ORDER BY tournaments.date IS NULL, tournaments.date DESC, ranked.tournament_id DESC
    `,
    [teamIdNumber]
  );

  const overall = overallRows[0] || {
    total_points: 0,
    total_kills: 0,
    matches_played: 0
  };

  const averagePlacementValue = placementRows[0]?.average_placement;

  return {
    team,
    overall: {
      total_points: Number(overall.total_points || 0),
      total_kills: Number(overall.total_kills || 0),
      matches_played: Number(overall.matches_played || 0),
      average_placement: averagePlacementValue === null || averagePlacementValue === undefined
        ? null
        : Number(Number(averagePlacementValue).toFixed(2))
    },
    tournament_history: historyRows.map((row) => ({
      tournament_id: Number(row.tournament_id),
      tournament_name: row.tournament_name,
      rank: Number(row.tournament_rank),
      matches_played: Number(row.matches_played || 0),
      total_kills: Number(row.total_kills || 0),
      total_points: Number(row.total_points || 0)
    }))
  };
}

async function getAdminTeams() {
  const [rows] = await pool.query(
    `
      SELECT
        teams.id,
        teams.name,
        teams.logo_url,
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
  getTeamProfile,
  getAdminTeams
};
