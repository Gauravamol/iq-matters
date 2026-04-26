const { pool, withTransaction } = require("../config/db");
const { HttpError } = require("../utils/http");
const { getPlacementPointsMap, calculateMatchPoints } = require("./scoringService");
const { syncCompetitionState } = require("./competitionStateService");

function toPositiveNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive number`);
  }

  return number;
}

function toNonNegativeNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new HttpError(400, `${fieldName} must be a non-negative number`);
  }

  return number;
}

async function loadMatch(connection, matchId) {
  const [rows] = await connection.query(
    `
      SELECT matches.*, tournaments.name AS tournament_name
      FROM matches
      JOIN tournaments ON tournaments.id = matches.tournament_id
      WHERE matches.id = ?
      LIMIT 1
    `,
    [matchId]
  );

  return rows[0] || null;
}

async function loadResult(connection, resultId) {
  const [rows] = await connection.query(
    `
      SELECT
        results.id,
        results.match_id,
        results.team_id,
        results.position,
        results.kills,
        results.points,
        results.report_notes,
        matches.tournament_id,
        matches.match_number,
        matches.map_name,
        matches.status AS match_status,
        tournaments.name AS tournament_name,
        teams.name AS team_name
      FROM results
      JOIN matches ON matches.id = results.match_id
      JOIN tournaments ON tournaments.id = matches.tournament_id
      JOIN teams ON teams.id = results.team_id
      WHERE results.id = ?
      LIMIT 1
    `,
    [resultId]
  );

  return rows[0] || null;
}

async function loadPlayersByTeam(connection, teamId) {
  const [rows] = await connection.query(
    `
      SELECT id, team_id, player_name, player_uid, logo_url
      FROM players
      WHERE team_id = ?
      ORDER BY id ASC
    `,
    [Number(teamId)]
  );

  return rows;
}

async function loadResultPlayerStats(connection, resultId) {
  const [rows] = await connection.query(
    `
      SELECT
        player_match_stats.id,
        player_match_stats.result_id,
        player_match_stats.match_id,
        player_match_stats.team_id,
        player_match_stats.player_id,
        player_match_stats.kills,
        players.player_name,
        players.player_uid,
        players.logo_url
      FROM player_match_stats
      JOIN players ON players.id = player_match_stats.player_id
      WHERE player_match_stats.result_id = ?
      ORDER BY player_match_stats.kills DESC, players.player_name ASC
    `,
    [Number(resultId)]
  );

  return rows.map((row) => ({
    ...row,
    kills: Number(row.kills || 0)
  }));
}

function normalizePlayerStats(playerStats, teamPlayers, teamKills) {
  if (!Array.isArray(playerStats) || !playerStats.length) {
    return [];
  }

  const playersById = new Map(teamPlayers.map((player) => [Number(player.id), player]));
  const seenPlayerIds = new Set();
  const normalizedStats = [];
  let aggregatedKills = 0;

  for (const entry of playerStats) {
    const playerId = Number(entry?.player_id);
    const kills = toNonNegativeNumber(entry?.kills ?? 0, "Player kills");

    if (!playerId || !playersById.has(playerId)) {
      throw new HttpError(400, "Player stats must reference players from the selected team");
    }

    if (seenPlayerIds.has(playerId)) {
      throw new HttpError(409, "Each player can only appear once in the result breakdown");
    }

    seenPlayerIds.add(playerId);
    aggregatedKills += kills;
    normalizedStats.push({
      player_id: playerId,
      kills
    });
  }

  if (aggregatedKills !== Number(teamKills)) {
    throw new HttpError(400, "Player kill breakdown must equal the team kills");
  }

  return normalizedStats;
}

async function replaceResultPlayerStats(connection, { resultId, matchId, teamId, playerStats }) {
  await connection.query(
    "DELETE FROM player_match_stats WHERE result_id = ?",
    [Number(resultId)]
  );

  for (const playerStat of playerStats) {
    await connection.query(
      `
        INSERT INTO player_match_stats (result_id, match_id, team_id, player_id, kills)
        VALUES (?, ?, ?, ?, ?)
      `,
      [Number(resultId), Number(matchId), Number(teamId), Number(playerStat.player_id), Number(playerStat.kills)]
    );
  }
}

function attachPlayersToTeams(teams, playerRows) {
  const playersByTeamId = playerRows.reduce((accumulator, player) => {
    const teamId = Number(player.team_id);

    if (!accumulator.has(teamId)) {
      accumulator.set(teamId, []);
    }

    accumulator.get(teamId).push(player);
    return accumulator;
  }, new Map());

  return teams.map((team) => ({
    ...team,
    players: playersByTeamId.get(Number(team.id)) || []
  }));
}

async function validateTeamForMatch(connection, { match, teamId, resultIdToIgnore = null }) {
  const [teamRows] = await connection.query(
    "SELECT id FROM teams WHERE id = ? LIMIT 1",
    [teamId]
  );

  if (!teamRows.length) {
    throw new HttpError(404, "Team not found");
  }

  const [registrationRows] = await connection.query(
    `
      SELECT 1
      FROM tournament_teams
      WHERE tournament_id = ? AND team_id = ? AND COALESCE(disqualified, 0) = 0
      LIMIT 1
    `,
    [match.tournament_id, teamId]
  );

  if (!registrationRows.length) {
    throw new HttpError(400, "Team is not registered for this tournament");
  }

  const [assignmentRows] = await connection.query(
    "SELECT team_id FROM match_teams WHERE match_id = ?",
    [match.id]
  );

  if (assignmentRows.length) {
    const assignedTeamIds = new Set(assignmentRows.map((row) => Number(row.team_id)));

    if (!assignedTeamIds.has(teamId)) {
      throw new HttpError(400, "Team is not assigned to this match");
    }
  }

  const duplicateSql = resultIdToIgnore
    ? "SELECT 1 FROM results WHERE match_id = ? AND team_id = ? AND id <> ? LIMIT 1"
    : "SELECT 1 FROM results WHERE match_id = ? AND team_id = ? LIMIT 1";
  const duplicateParams = resultIdToIgnore ? [match.id, teamId, resultIdToIgnore] : [match.id, teamId];
  const [duplicateRows] = await connection.query(duplicateSql, duplicateParams);

  if (duplicateRows.length) {
    throw new HttpError(409, "This team already has a submitted result for the match");
  }
}

async function createMatch(payload) {
  const tournamentId = toPositiveNumber(payload.tournament_id, "Tournament ID");
  const matchNumber = toPositiveNumber(payload.match_number, "Match number");
  const mapName = String(payload.map_name || "").trim();
  const scheduledAt = payload.scheduled_at || null;
  const status = payload.status ? String(payload.status).trim() : "pending";

  if (!mapName) {
    throw new HttpError(400, "Map name is required");
  }

  if (!["pending", "completed"].includes(status)) {
    throw new HttpError(400, "Match status must be pending or completed");
  }

  const [tournamentRows] = await pool.query(
    "SELECT id FROM tournaments WHERE id = ? LIMIT 1",
    [tournamentId]
  );

  if (!tournamentRows.length) {
    throw new HttpError(404, "Tournament not found");
  }

  const [result] = await pool.query(
    `
      INSERT INTO matches (tournament_id, match_number, status, map_name, scheduled_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [tournamentId, matchNumber, status, mapName, scheduledAt]
  );

  const [rows] = await pool.query(
    "SELECT * FROM matches WHERE id = ? LIMIT 1",
    [result.insertId]
  );

  return rows[0];
}

async function getMatchesByTournament(tournamentId) {
  const [rows] = await pool.query(
    `
      SELECT
        matches.id,
        matches.tournament_id,
        matches.match_number,
        matches.status,
        matches.map_name,
        matches.created_at,
        matches.scheduled_at,
        COUNT(DISTINCT match_teams.team_id) AS assigned_teams
      FROM matches
      LEFT JOIN match_teams ON match_teams.match_id = matches.id
      WHERE matches.tournament_id = ?
      GROUP BY matches.id
      ORDER BY matches.scheduled_at IS NULL, matches.scheduled_at ASC, matches.match_number ASC
    `,
    [Number(tournamentId)]
  );

  return rows.map((row) => ({
    ...row,
    assigned_teams: Number(row.assigned_teams || 0)
  }));
}

async function getMatchResultsByTournament(tournamentId) {
  const [rows] = await pool.query(
    `
      SELECT
        results.id,
        results.match_id,
        results.team_id,
        results.position,
        results.kills,
        results.points,
        results.report_notes,
        matches.match_number,
        matches.map_name,
        teams.name AS team_name
      FROM results
      JOIN matches ON matches.id = results.match_id
      JOIN teams ON teams.id = results.team_id
      WHERE matches.tournament_id = ?
      ORDER BY
        matches.match_number ASC,
        results.points DESC,
        results.kills DESC,
        results.position ASC,
        teams.name ASC
    `,
    [Number(tournamentId)]
  );

  return rows;
}
async function getAdminMatches() {
  const [rows] = await pool.query(
    `
      SELECT
        matches.id,
        matches.tournament_id,
        matches.match_number,
        matches.status,
        matches.map_name,
        matches.created_at,
        matches.scheduled_at,
        tournaments.name AS tournament_name,
        COUNT(DISTINCT match_teams.team_id) AS assigned_teams,
        COUNT(DISTINCT results.id) AS result_count
      FROM matches
      JOIN tournaments ON tournaments.id = matches.tournament_id
      LEFT JOIN match_teams ON match_teams.match_id = matches.id
      LEFT JOIN results ON results.match_id = matches.id
      GROUP BY matches.id
      ORDER BY matches.scheduled_at IS NULL, matches.scheduled_at ASC, matches.id DESC
    `
  );

  return rows.map((row) => ({
    ...row,
    assigned_teams: Number(row.assigned_teams || 0),
    result_count: Number(row.result_count || 0)
  }));
}

async function updateMatch(matchId, payload) {
  const matchIdNumber = Number(matchId);

  return withTransaction(async (connection) => {
    const existingMatch = await loadMatch(connection, matchIdNumber);

    if (!existingMatch) {
      throw new HttpError(404, "Match not found");
    }

    const updates = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(payload, "tournament_id")) {
      const nextTournamentId = toPositiveNumber(payload.tournament_id, "Tournament ID");

      if (nextTournamentId !== Number(existingMatch.tournament_id)) {
        const [dependencyRows] = await connection.query(
          `
            SELECT
              (SELECT COUNT(*) FROM results WHERE match_id = ?) AS result_count,
              (SELECT COUNT(*) FROM match_teams WHERE match_id = ?) AS assignment_count
          `,
          [matchIdNumber, matchIdNumber]
        );

        if (Number(dependencyRows[0].result_count) || Number(dependencyRows[0].assignment_count)) {
          throw new HttpError(409, "Cannot move a match with existing assignments or results to another tournament");
        }

        const [tournamentRows] = await connection.query(
          "SELECT id FROM tournaments WHERE id = ? LIMIT 1",
          [nextTournamentId]
        );

        if (!tournamentRows.length) {
          throw new HttpError(404, "Tournament not found");
        }
      }

      updates.push("tournament_id = ?");
      values.push(nextTournamentId);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "match_number")) {
      updates.push("match_number = ?");
      values.push(toPositiveNumber(payload.match_number, "Match number"));
    }

    if (Object.prototype.hasOwnProperty.call(payload, "map_name")) {
      const mapName = String(payload.map_name || "").trim();

      if (!mapName) {
        throw new HttpError(400, "Map name is required");
      }

      updates.push("map_name = ?");
      values.push(mapName);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "scheduled_at")) {
      updates.push("scheduled_at = ?");
      values.push(payload.scheduled_at || null);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "status")) {
      const status = String(payload.status || "pending").trim();

      if (!["pending", "completed"].includes(status)) {
        throw new HttpError(400, "Match status must be pending or completed");
      }

      updates.push("status = ?");
      values.push(status);
    }

    if (!updates.length) {
      throw new HttpError(400, "No match updates were provided");
    }

    values.push(matchIdNumber);

    await connection.query(
      `UPDATE matches SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    await syncCompetitionState(connection);

    return loadMatch(connection, matchIdNumber);
  });
}

async function deleteMatch(matchId) {
  const matchIdNumber = Number(matchId);

  return withTransaction(async (connection) => {
    const existingMatch = await loadMatch(connection, matchIdNumber);

    if (!existingMatch) {
      throw new HttpError(404, "Match not found");
    }

    await connection.query("DELETE FROM results WHERE match_id = ?", [matchIdNumber]);
    await connection.query("DELETE FROM match_teams WHERE match_id = ?", [matchIdNumber]);
    await connection.query("DELETE FROM matches WHERE id = ?", [matchIdNumber]);

    await syncCompetitionState(connection);

    return existingMatch;
  });
}

async function getMatchAssignments(matchId) {
  const connection = await pool.getConnection();

  try {
    const match = await loadMatch(connection, Number(matchId));

    if (!match) {
      throw new HttpError(404, "Match not found");
    }

    const [assignedTeams] = await connection.query(
      `
        SELECT teams.id, teams.name, teams.logo_url
        FROM match_teams
        JOIN teams ON teams.id = match_teams.team_id
        WHERE match_teams.match_id = ?
        ORDER BY teams.name ASC
      `,
      [Number(matchId)]
    );

    const [availableTeams] = await connection.query(
      `
        SELECT teams.id, teams.name, teams.logo_url
        FROM tournament_teams
        JOIN teams ON teams.id = tournament_teams.team_id
        WHERE tournament_teams.tournament_id = ?
          AND COALESCE(tournament_teams.disqualified, 0) = 0
        ORDER BY teams.name ASC
      `,
      [match.tournament_id]
    );

    const allTeamIds = [...new Set([
      ...assignedTeams.map((team) => Number(team.id)),
      ...availableTeams.map((team) => Number(team.id))
    ])];
    const [playerRows] = allTeamIds.length
      ? await connection.query(
        `
          SELECT id, team_id, player_name, player_uid, logo_url
          FROM players
          WHERE team_id IN (?)
          ORDER BY team_id ASC, id ASC
        `,
        [allTeamIds]
      )
      : [[]];

    return {
      match,
      assignedTeams: attachPlayersToTeams(assignedTeams, playerRows),
      availableTeams: attachPlayersToTeams(availableTeams, playerRows)
    };
  } finally {
    connection.release();
  }
}

async function assignMatchTeams(matchId, teamIds) {
  const normalizedTeamIds = [...new Set((teamIds || []).map((teamId) => Number(teamId)).filter(Boolean))];

  return withTransaction(async (connection) => {
    const match = await loadMatch(connection, Number(matchId));

    if (!match) {
      throw new HttpError(404, "Match not found");
    }

    const [eligibleRows] = await connection.query(
      "SELECT team_id FROM tournament_teams WHERE tournament_id = ? AND COALESCE(disqualified, 0) = 0",
      [match.tournament_id]
    );

    const eligibleTeamIds = new Set(eligibleRows.map((row) => Number(row.team_id)));

    if (normalizedTeamIds.some((teamId) => !eligibleTeamIds.has(teamId))) {
      throw new HttpError(400, "All assigned teams must be registered for this tournament");
    }

    await connection.query(
      "DELETE FROM match_teams WHERE match_id = ?",
      [Number(matchId)]
    );

    for (const teamId of normalizedTeamIds) {
      await connection.query(
        "INSERT INTO match_teams (match_id, team_id) VALUES (?, ?)",
        [Number(matchId), teamId]
      );
    }

    await syncCompetitionState(connection);

    const [assignedTeams] = await connection.query(
      `
        SELECT teams.id, teams.name
        FROM match_teams
        JOIN teams ON teams.id = match_teams.team_id
        WHERE match_teams.match_id = ?
        ORDER BY teams.name ASC
      `,
      [Number(matchId)]
    );

    return {
      match: await loadMatch(connection, Number(matchId)),
      assignedTeams
    };
  });
}

async function listAdminResults() {
  const [rows] = await pool.query(
    `
      SELECT
        results.id,
        results.match_id,
        results.team_id,
        results.position,
        results.kills,
        results.points,
        results.report_notes,
        matches.tournament_id,
        matches.match_number,
        matches.map_name,
        tournaments.name AS tournament_name,
        teams.name AS team_name
      FROM results
      JOIN matches ON matches.id = results.match_id
      JOIN tournaments ON tournaments.id = matches.tournament_id
      JOIN teams ON teams.id = results.team_id
      ORDER BY results.id DESC
    `
  );

  return rows;
}

async function getAdminResult(resultId) {
  const connection = await pool.getConnection();

  try {
    const result = await loadResult(connection, Number(resultId));

    if (!result) {
      throw new HttpError(404, "Result not found");
    }

    return {
      ...result,
      player_stats: await loadResultPlayerStats(connection, Number(resultId))
    };
  } finally {
    connection.release();
  }
}

async function submitResult(payload) {
  const matchId = toPositiveNumber(payload.match_id, "Match ID");
  const teamId = toPositiveNumber(payload.team_id, "Team ID");
  const placement = toPositiveNumber(payload.position, "Placement");
  const kills = toNonNegativeNumber(payload.kills, "Kills");
  const requestedTournamentId = payload.tournament_id ? Number(payload.tournament_id) : null;
  const reportNotes = String(payload.report_notes || "").trim() || null;

  return withTransaction(async (connection) => {
    const match = await loadMatch(connection, matchId);

    if (!match) {
      throw new HttpError(404, "Match not found");
    }

    if (requestedTournamentId && requestedTournamentId !== Number(match.tournament_id)) {
      throw new HttpError(400, "Match does not belong to the supplied tournament");
    }

    await validateTeamForMatch(connection, { match, teamId });
    const teamPlayers = await loadPlayersByTeam(connection, teamId);
    const playerStats = normalizePlayerStats(payload.player_stats, teamPlayers, kills);

    const placementPointsMap = await getPlacementPointsMap(connection, Number(match.tournament_id));
    const totalPoints = calculateMatchPoints({ placement, kills }, placementPointsMap);

    const [result] = await connection.query(
      `
        INSERT INTO results (match_id, team_id, position, kills, points, report_notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [matchId, teamId, placement, kills, totalPoints, reportNotes]
    );

    await replaceResultPlayerStats(connection, {
      resultId: result.insertId,
      matchId,
      teamId,
      playerStats
    });

    await syncCompetitionState(connection);
    const refreshedMatch = await loadMatch(connection, matchId);

    return {
      result_id: result.insertId,
      match_id: matchId,
      tournament_id: Number(match.tournament_id),
      team_id: teamId,
      total_points: totalPoints,
      status: refreshedMatch.status
    };
  });
}

async function updateResult(resultId, payload) {
  const resultIdNumber = Number(resultId);

  return withTransaction(async (connection) => {
    const existingResult = await loadResult(connection, resultIdNumber);

    if (!existingResult) {
      throw new HttpError(404, "Result not found");
    }

    const nextMatchId = Object.prototype.hasOwnProperty.call(payload, "match_id")
      ? toPositiveNumber(payload.match_id, "Match ID")
      : Number(existingResult.match_id);
    const nextTeamId = Object.prototype.hasOwnProperty.call(payload, "team_id")
      ? toPositiveNumber(payload.team_id, "Team ID")
      : Number(existingResult.team_id);
    const nextPlacement = Object.prototype.hasOwnProperty.call(payload, "position")
      ? toPositiveNumber(payload.position, "Placement")
      : Number(existingResult.position);
    const nextKills = Object.prototype.hasOwnProperty.call(payload, "kills")
      ? toNonNegativeNumber(payload.kills, "Kills")
      : Number(existingResult.kills);
    const nextReportNotes = Object.prototype.hasOwnProperty.call(payload, "report_notes")
      ? (String(payload.report_notes || "").trim() || null)
      : existingResult.report_notes;

    const match = await loadMatch(connection, nextMatchId);

    if (!match) {
      throw new HttpError(404, "Match not found");
    }

    await validateTeamForMatch(connection, {
      match,
      teamId: nextTeamId,
      resultIdToIgnore: resultIdNumber
    });
    const teamPlayers = await loadPlayersByTeam(connection, nextTeamId);
    const shouldUpdatePlayerStats = Object.prototype.hasOwnProperty.call(payload, "player_stats")
      || nextTeamId !== Number(existingResult.team_id)
      || nextMatchId !== Number(existingResult.match_id)
      || nextKills !== Number(existingResult.kills);
    const nextPlayerStats = shouldUpdatePlayerStats
      ? normalizePlayerStats(payload.player_stats || [], teamPlayers, nextKills)
      : await loadResultPlayerStats(connection, resultIdNumber);

    const placementPointsMap = await getPlacementPointsMap(connection, Number(match.tournament_id));
    const totalPoints = calculateMatchPoints({ placement: nextPlacement, kills: nextKills }, placementPointsMap);

    await connection.query(
      `
        UPDATE results
        SET match_id = ?, team_id = ?, position = ?, kills = ?, points = ?, report_notes = ?
        WHERE id = ?
      `,
      [nextMatchId, nextTeamId, nextPlacement, nextKills, totalPoints, nextReportNotes, resultIdNumber]
    );

    await replaceResultPlayerStats(connection, {
      resultId: resultIdNumber,
      matchId: nextMatchId,
      teamId: nextTeamId,
      playerStats: nextPlayerStats
    });

    await syncCompetitionState(connection);

    return {
      ...(await loadResult(connection, resultIdNumber)),
      player_stats: await loadResultPlayerStats(connection, resultIdNumber)
    };
  });
}

async function deleteResult(resultId) {
  const resultIdNumber = Number(resultId);

  return withTransaction(async (connection) => {
    const existingResult = await loadResult(connection, resultIdNumber);

    if (!existingResult) {
      throw new HttpError(404, "Result not found");
    }

    await connection.query("DELETE FROM player_match_stats WHERE result_id = ?", [resultIdNumber]);
    await connection.query("DELETE FROM results WHERE id = ?", [resultIdNumber]);
    await syncCompetitionState(connection);

    return existingResult;
  });
}

module.exports = {
  createMatch,
  getMatchesByTournament,
  getMatchResultsByTournament,
  getAdminMatches,
  updateMatch,
  deleteMatch,
  getMatchAssignments,
  assignMatchTeams,
  listAdminResults,
  getAdminResult,
  submitResult,
  updateResult,
  deleteResult
};
