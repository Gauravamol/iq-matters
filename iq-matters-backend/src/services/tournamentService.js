const { pool, withTransaction } = require("../config/db");
const { HttpError } = require("../utils/http");

function parseNumeric(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseNonNegativeNumber(value, fieldName, fallback = 0) {
  const number = parseNumeric(value, fallback);

  if (!Number.isFinite(number) || number < 0) {
    throw new HttpError(400, `${fieldName} must be a non-negative number`);
  }

  return number;
}

function parsePositiveNumber(value, fieldName, fallback = null) {
  const number = parseNumeric(value, fallback);

  if (!Number.isFinite(number) || number <= 0) {
    throw new HttpError(400, `${fieldName} must be greater than 0`);
  }

  return number;
}

function parseBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalizedValue = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalizedValue);
}

function normalizePointsSystem(pointsSystemInput, allowEmpty = true) {
  if (pointsSystemInput === undefined || pointsSystemInput === null || pointsSystemInput === "") {
    return allowEmpty ? [] : null;
  }

  if (!Array.isArray(pointsSystemInput)) {
    throw new HttpError(400, "Points system must be an array");
  }

  const normalizedRules = pointsSystemInput
    .map((rule) => ({
      position: Number(rule?.position),
      points: Number(rule?.points)
    }))
    .filter((rule) => Number.isFinite(rule.position) && rule.position > 0 && Number.isFinite(rule.points) && rule.points >= 0)
    .sort((left, right) => left.position - right.position);

  if (!allowEmpty && !normalizedRules.length) {
    throw new HttpError(400, "Add at least one valid points rule");
  }

  return normalizedRules;
}

function parsePointsSystemJson(value) {
  if (!value) {
    return [];
  }

  try {
    return normalizePointsSystem(JSON.parse(value), true);
  } catch (error) {
    return [];
  }
}

function normalizeTournamentStatus(value) {
  return String(value || "upcoming").trim();
}

function isValidTournamentStatus(status) {
  return ["upcoming", "live", "completed"].includes(status);
}

function buildRegistrationState(tournament) {
  const joinedTeams = Number(tournament.joined_teams || 0);
  const pendingRequests = Number(tournament.pending_requests || 0);
  const maxTeams = Number(tournament.max_teams || 0);
  const isJoined = Boolean(tournament.is_joined);
  const isDisqualified = Boolean(tournament.is_disqualified);
  const reservedSlots = joinedTeams + pendingRequests;
  const spotsLeft = maxTeams ? Math.max(maxTeams - reservedSlots, 0) : 0;

  if (isDisqualified) {
    return {
      spots_left: spotsLeft,
      registration_open: false,
      registration_reason: tournament.disqualification_reason || "Team disqualified"
    };
  }

  if (isJoined) {
    return {
      spots_left: spotsLeft,
      registration_open: false,
      registration_reason: "Already joined"
    };
  }

  if (tournament.status === "live") {
    return {
      spots_left: spotsLeft,
      registration_open: false,
      registration_reason: "Tournament is live"
    };
  }

  if (tournament.status === "completed") {
    return {
      spots_left: spotsLeft,
      registration_open: false,
      registration_reason: "Tournament completed"
    };
  }

  if (maxTeams && reservedSlots >= maxTeams) {
    return {
      spots_left: 0,
      registration_open: false,
      registration_reason: "Tournament full"
    };
  }

  return {
    spots_left: spotsLeft,
    registration_open: true,
    registration_reason: "Registration open"
  };
}

function normalizeTournamentRow(row) {
  return {
    ...row,
    joined_teams: Number(row.joined_teams || 0),
    max_teams: Number(row.max_teams || 0),
    min_players: Number(row.min_players || 1),
    max_players_per_team: Number(row.max_players_per_team || 4),
    pending_requests: Number(row.pending_requests || 0),
    is_joined: Boolean(row.is_joined),
    is_disqualified: Boolean(row.is_disqualified),
    show_contact_email_field: Boolean(row.show_contact_email_field),
    show_contact_discord_field: Boolean(row.show_contact_discord_field),
    show_contact_phone_field: Boolean(row.show_contact_phone_field),
    allow_team_logo: Boolean(row.allow_team_logo),
    allow_player_logo: Boolean(row.allow_player_logo),
    require_admin_approval: Boolean(row.require_admin_approval),
    points_system: parsePointsSystemJson(row.points_system_json),
    ...buildRegistrationState(row)
  };
}

async function loadTournament(connection, tournamentId) {
  const [rows] = await connection.query(
    "SELECT id, name, max_teams, status FROM tournaments WHERE id = ? LIMIT 1",
    [Number(tournamentId)]
  );

  return rows[0] || null;
}

async function loadTournamentRegistration(connection, tournamentId, teamId) {
  const [rows] = await connection.query(
    `
      SELECT tournament_id, team_id, COALESCE(disqualified, 0) AS disqualified, disqualification_reason
      FROM tournament_teams
      WHERE tournament_id = ? AND team_id = ?
      LIMIT 1
    `,
    [Number(tournamentId), Number(teamId)]
  );

  return rows[0] || null;
}

async function registerTeamForTournament(connection, { tournamentId, teamId }) {
  const resolvedTournamentId = Number(tournamentId);
  const resolvedTeamId = Number(teamId);
  const tournament = await loadTournament(connection, resolvedTournamentId);

  if (!tournament) {
    throw new HttpError(404, "Tournament not found");
  }

  const [teamRows] = await connection.query(
    "SELECT id FROM teams WHERE id = ? LIMIT 1",
    [resolvedTeamId]
  );

  if (!teamRows.length) {
    throw new HttpError(404, "Team not found");
  }

  const existingRegistration = await loadTournamentRegistration(connection, resolvedTournamentId, resolvedTeamId);

  if (existingRegistration) {
    if (Number(existingRegistration.disqualified || 0)) {
      throw new HttpError(409, existingRegistration.disqualification_reason || "Team is disqualified for this tournament");
    }

    throw new HttpError(409, "Team is already registered for this tournament");
  }

  if (tournament.status !== "upcoming") {
    throw new HttpError(409, "Registration is only open for upcoming tournaments");
  }

  const [countRows] = await connection.query(
    "SELECT COUNT(*) AS count FROM tournament_teams WHERE tournament_id = ? AND COALESCE(disqualified, 0) = 0",
    [resolvedTournamentId]
  );

  if (Number(tournament.max_teams || 0) && Number(countRows[0].count || 0) >= Number(tournament.max_teams)) {
    throw new HttpError(409, "Tournament has reached its team limit");
  }

  await connection.query(
    "INSERT INTO tournament_teams (tournament_id, team_id, disqualified, disqualification_reason) VALUES (?, ?, 0, NULL)",
    [resolvedTournamentId, resolvedTeamId]
  );

  return {
    tournament_id: resolvedTournamentId,
    team_id: resolvedTeamId
  };
}

async function setTournamentRegistrationStatus(tournamentId, teamId, payload) {
  const { syncCompetitionState } = require("./competitionStateService");
  const tournamentIdNumber = Number(tournamentId);
  const teamIdNumber = Number(teamId);
  const disqualified = Boolean(payload?.disqualified);
  const reason = disqualified
    ? (String(payload?.disqualification_reason || payload?.reason || "").trim() || "Disqualified by admin")
    : null;

  return withTransaction(async (connection) => {
    const registration = await loadTournamentRegistration(connection, tournamentIdNumber, teamIdNumber);

    if (!registration) {
      throw new HttpError(404, "Tournament registration not found");
    }

    await connection.query(
      `
        UPDATE tournament_teams
        SET disqualified = ?, disqualification_reason = ?
        WHERE tournament_id = ? AND team_id = ?
      `,
      [disqualified ? 1 : 0, reason, tournamentIdNumber, teamIdNumber]
    );

    await syncCompetitionState(connection);

    const [rows] = await connection.query(
      `
        SELECT
          teams.id,
          teams.name,
          teams.logo_url,
          COALESCE(stats.total_points, 0) AS tournament_points,
          COALESCE(stats.total_kills, 0) AS tournament_kills,
          COALESCE(stats.matches_played, 0) AS matches_played,
          COALESCE(player_counts.player_count, 0) AS player_count,
          COALESCE(tournament_teams.disqualified, 0) AS disqualified,
          tournament_teams.disqualification_reason
        FROM tournament_teams
        JOIN teams ON teams.id = tournament_teams.team_id
        LEFT JOIN (
          SELECT team_id, COUNT(*) AS player_count
          FROM players
          GROUP BY team_id
        ) player_counts ON player_counts.team_id = teams.id
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
        WHERE tournament_teams.tournament_id = ? AND tournament_teams.team_id = ?
        LIMIT 1
      `,
      [tournamentIdNumber, teamIdNumber]
    );

    return {
      ...rows[0],
      tournament_points: Number(rows[0]?.tournament_points || 0),
      tournament_kills: Number(rows[0]?.tournament_kills || 0),
      matches_played: Number(rows[0]?.matches_played || 0),
      player_count: Number(rows[0]?.player_count || 0),
      disqualified: Boolean(rows[0]?.disqualified)
    };
  });
}

async function removeTournamentRegistration(tournamentId, teamId) {
  const { syncCompetitionState } = require("./competitionStateService");
  const tournamentIdNumber = Number(tournamentId);
  const teamIdNumber = Number(teamId);

  return withTransaction(async (connection) => {
    const registration = await loadTournamentRegistration(connection, tournamentIdNumber, teamIdNumber);

    if (!registration) {
      throw new HttpError(404, "Tournament registration not found");
    }

    await connection.query(
      `
        DELETE player_match_stats
        FROM player_match_stats
        JOIN results ON results.id = player_match_stats.result_id
        JOIN matches ON matches.id = results.match_id
        WHERE matches.tournament_id = ? AND results.team_id = ?
      `,
      [tournamentIdNumber, teamIdNumber]
    );

    await connection.query(
      `
        DELETE results
        FROM results
        JOIN matches ON matches.id = results.match_id
        WHERE matches.tournament_id = ? AND results.team_id = ?
      `,
      [tournamentIdNumber, teamIdNumber]
    );

    await connection.query(
      `
        DELETE match_teams
        FROM match_teams
        JOIN matches ON matches.id = match_teams.match_id
        WHERE matches.tournament_id = ? AND match_teams.team_id = ?
      `,
      [tournamentIdNumber, teamIdNumber]
    );

    await connection.query(
      "DELETE FROM tournament_teams WHERE tournament_id = ? AND team_id = ?",
      [tournamentIdNumber, teamIdNumber]
    );

    await syncCompetitionState(connection);

    return {
      tournament_id: tournamentIdNumber,
      team_id: teamIdNumber
    };
  });
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
        COALESCE(tournaments.min_players, 1) AS min_players,
        COALESCE(tournaments.max_players_per_team, 4) AS max_players_per_team,
        COALESCE(tournaments.show_contact_email_field, 1) AS show_contact_email_field,
        COALESCE(tournaments.show_contact_discord_field, 0) AS show_contact_discord_field,
        COALESCE(tournaments.show_contact_phone_field, 0) AS show_contact_phone_field,
        COALESCE(tournaments.allow_team_logo, 1) AS allow_team_logo,
        COALESCE(tournaments.allow_player_logo, 1) AS allow_player_logo,
        COALESCE(tournaments.require_admin_approval, 1) AS require_admin_approval,
        tournaments.points_system_json,
        tournaments.status,
        COUNT(DISTINCT CASE WHEN COALESCE(tournament_teams.disqualified, 0) = 0 THEN tournament_teams.team_id END) AS joined_teams,
        COUNT(DISTINCT CASE WHEN requests.status = 'pending' THEN requests.id END) AS pending_requests,
        MAX(CASE WHEN tournament_teams.team_id = ? AND COALESCE(tournament_teams.disqualified, 0) = 0 THEN 1 ELSE 0 END) AS is_joined,
        MAX(CASE WHEN tournament_teams.team_id = ? AND COALESCE(tournament_teams.disqualified, 0) = 1 THEN 1 ELSE 0 END) AS is_disqualified,
        MAX(CASE WHEN tournament_teams.team_id = ? THEN tournament_teams.disqualification_reason ELSE NULL END) AS disqualification_reason
      FROM tournaments
      LEFT JOIN tournament_teams ON tournament_teams.tournament_id = tournaments.id
      LEFT JOIN tournament_registration_requests requests ON requests.tournament_id = tournaments.id
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
    [viewerTeamId || -1, viewerTeamId || -1, viewerTeamId || -1]
  );

  return rows.map(normalizeTournamentRow);
}

async function getTournamentById(tournamentId, viewerTeamId = null) {
  const [rows] = await pool.query(
    `
      SELECT
        tournaments.id,
        tournaments.name,
        tournaments.date,
        tournaments.entry_fee,
        tournaments.prize_pool,
        tournaments.max_teams,
        COALESCE(tournaments.min_players, 1) AS min_players,
        COALESCE(tournaments.max_players_per_team, 4) AS max_players_per_team,
        COALESCE(tournaments.show_contact_email_field, 1) AS show_contact_email_field,
        COALESCE(tournaments.show_contact_discord_field, 0) AS show_contact_discord_field,
        COALESCE(tournaments.show_contact_phone_field, 0) AS show_contact_phone_field,
        COALESCE(tournaments.allow_team_logo, 1) AS allow_team_logo,
        COALESCE(tournaments.allow_player_logo, 1) AS allow_player_logo,
        COALESCE(tournaments.require_admin_approval, 1) AS require_admin_approval,
        tournaments.points_system_json,
        tournaments.status,
        COUNT(DISTINCT CASE WHEN COALESCE(tournament_teams.disqualified, 0) = 0 THEN tournament_teams.team_id END) AS joined_teams,
        COUNT(DISTINCT CASE WHEN requests.status = 'pending' THEN requests.id END) AS pending_requests,
        MAX(CASE WHEN tournament_teams.team_id = ? AND COALESCE(tournament_teams.disqualified, 0) = 0 THEN 1 ELSE 0 END) AS is_joined,
        MAX(CASE WHEN tournament_teams.team_id = ? AND COALESCE(tournament_teams.disqualified, 0) = 1 THEN 1 ELSE 0 END) AS is_disqualified,
        MAX(CASE WHEN tournament_teams.team_id = ? THEN tournament_teams.disqualification_reason ELSE NULL END) AS disqualification_reason
      FROM tournaments
      LEFT JOIN tournament_teams ON tournament_teams.tournament_id = tournaments.id
      LEFT JOIN tournament_registration_requests requests ON requests.tournament_id = tournaments.id
      WHERE tournaments.id = ?
      GROUP BY tournaments.id
      LIMIT 1
    `,
    [viewerTeamId || -1, viewerTeamId || -1, viewerTeamId || -1, Number(tournamentId)]
  );

  return normalizeTournamentRow(rows[0] || null);
}

async function createTournament(payload) {
  const name = String(payload.name || "").trim();
  const date = payload.date || null;
  const entryFee = parseNonNegativeNumber(payload.entry_fee, "Entry fee", 0);
  const prizePool = parseNonNegativeNumber(payload.prize_pool, "Prize pool", 0);
  const maxTeams = parsePositiveNumber(payload.max_teams, "Max teams", 0);
  const minPlayers = parsePositiveNumber(payload.min_players, "Min players", 1);
  const maxPlayersPerTeam = parsePositiveNumber(
    Object.prototype.hasOwnProperty.call(payload, "max_players_per_team") ? payload.max_players_per_team : payload.max_players,
    "Max players per team",
    4
  );
  const showContactEmailField = parseBooleanFlag(payload.show_contact_email_field, true);
  const showContactDiscordField = parseBooleanFlag(payload.show_contact_discord_field, false);
  const showContactPhoneField = parseBooleanFlag(payload.show_contact_phone_field, false);
  const allowTeamLogo = parseBooleanFlag(payload.allow_team_logo, true);
  const allowPlayerLogo = parseBooleanFlag(payload.allow_player_logo, true);
  const requireAdminApproval = parseBooleanFlag(payload.require_admin_approval, true);
  const pointsSystem = normalizePointsSystem(payload.points_system || payload.pointsSystem || [], true);
  const status = normalizeTournamentStatus(payload.status);

  if (!name) {
    throw new HttpError(400, "Tournament name is required");
  }

  if (!isValidTournamentStatus(status)) {
    throw new HttpError(400, "Tournament status must be upcoming, live, or completed");
  }

  if (minPlayers > maxPlayersPerTeam) {
    throw new HttpError(400, "Minimum players cannot be greater than maximum players per team");
  }

  const [result] = await pool.query(
    `
      INSERT INTO tournaments (
        name,
        date,
        entry_fee,
        prize_pool,
        max_teams,
        min_players,
        max_players_per_team,
        show_contact_email_field,
        show_contact_discord_field,
        show_contact_phone_field,
        allow_team_logo,
        allow_player_logo,
        require_admin_approval,
        points_system_json,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      date,
      entryFee,
      prizePool,
      maxTeams,
      minPlayers,
      maxPlayersPerTeam,
      showContactEmailField ? 1 : 0,
      showContactDiscordField ? 1 : 0,
      showContactPhoneField ? 1 : 0,
      allowTeamLogo ? 1 : 0,
      allowPlayerLogo ? 1 : 0,
      requireAdminApproval ? 1 : 0,
      pointsSystem.length ? JSON.stringify(pointsSystem) : null,
      status
    ]
  );

  return getTournamentById(result.insertId);
}

async function updateTournament(tournamentId, payload) {
  const tournamentIdNumber = Number(tournamentId);
  const [existingRows] = await pool.query(
    "SELECT id FROM tournaments WHERE id = ? LIMIT 1",
    [tournamentIdNumber]
  );

  if (!existingRows.length) {
    throw new HttpError(404, "Tournament not found");
  }

  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    const name = String(payload.name || "").trim();

    if (!name) {
      throw new HttpError(400, "Tournament name is required");
    }

    updates.push("name = ?");
    values.push(name);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "date")) {
    updates.push("date = ?");
    values.push(payload.date === "" ? null : payload.date || null);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "entry_fee")) {
    updates.push("entry_fee = ?");
    values.push(parseNonNegativeNumber(payload.entry_fee, "Entry fee", 0));
  }

  if (Object.prototype.hasOwnProperty.call(payload, "prize_pool")) {
    updates.push("prize_pool = ?");
    values.push(parseNonNegativeNumber(payload.prize_pool, "Prize pool", 0));
  }

  if (Object.prototype.hasOwnProperty.call(payload, "max_teams")) {
    const maxTeams = parsePositiveNumber(payload.max_teams, "Max teams", 0);
    const [countRows] = await pool.query(
      `
        SELECT
          (
            SELECT COUNT(DISTINCT team_id)
            FROM tournament_teams
            WHERE tournament_id = ? AND COALESCE(disqualified, 0) = 0
          ) + (
            SELECT COUNT(*)
            FROM tournament_registration_requests
            WHERE tournament_id = ? AND status = 'pending'
          ) AS count
      `,
      [tournamentIdNumber, tournamentIdNumber]
    );

    if (maxTeams < Number(countRows[0]?.count || 0)) {
      throw new HttpError(409, "Max teams cannot be lower than the number of registered or pending teams");
    }

    updates.push("max_teams = ?");
    values.push(maxTeams);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "min_players")) {
    updates.push("min_players = ?");
    values.push(parsePositiveNumber(payload.min_players, "Min players", 1));
  }

  if (Object.prototype.hasOwnProperty.call(payload, "max_players_per_team") || Object.prototype.hasOwnProperty.call(payload, "max_players")) {
    updates.push("max_players_per_team = ?");
    values.push(parsePositiveNumber(
      Object.prototype.hasOwnProperty.call(payload, "max_players_per_team") ? payload.max_players_per_team : payload.max_players,
      "Max players per team",
      4
    ));
  }

  if (Object.prototype.hasOwnProperty.call(payload, "show_contact_email_field")) {
    updates.push("show_contact_email_field = ?");
    values.push(parseBooleanFlag(payload.show_contact_email_field, true) ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "show_contact_discord_field")) {
    updates.push("show_contact_discord_field = ?");
    values.push(parseBooleanFlag(payload.show_contact_discord_field, false) ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "show_contact_phone_field")) {
    updates.push("show_contact_phone_field = ?");
    values.push(parseBooleanFlag(payload.show_contact_phone_field, false) ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "allow_team_logo")) {
    updates.push("allow_team_logo = ?");
    values.push(parseBooleanFlag(payload.allow_team_logo, true) ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "allow_player_logo")) {
    updates.push("allow_player_logo = ?");
    values.push(parseBooleanFlag(payload.allow_player_logo, true) ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "require_admin_approval")) {
    updates.push("require_admin_approval = ?");
    values.push(parseBooleanFlag(payload.require_admin_approval, true) ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "points_system") || Object.prototype.hasOwnProperty.call(payload, "pointsSystem")) {
    const pointsSystem = normalizePointsSystem(payload.points_system || payload.pointsSystem || [], true);
    updates.push("points_system_json = ?");
    values.push(pointsSystem.length ? JSON.stringify(pointsSystem) : null);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    const status = normalizeTournamentStatus(payload.status);

    if (!isValidTournamentStatus(status)) {
      throw new HttpError(400, "Tournament status must be upcoming, live, or completed");
    }

    updates.push("status = ?");
    values.push(status);
  }

  if (!updates.length) {
    throw new HttpError(400, "No tournament updates were provided");
  }

  values.push(tournamentIdNumber);

  const [settingsRows] = await pool.query(
    `
      SELECT
        COALESCE(min_players, 1) AS min_players,
        COALESCE(max_players_per_team, 4) AS max_players_per_team
      FROM tournaments
      WHERE id = ?
      LIMIT 1
    `,
    [tournamentIdNumber]
  );

  const nextMinPlayers = Object.prototype.hasOwnProperty.call(payload, "min_players")
    ? parsePositiveNumber(payload.min_players, "Min players", 1)
    : Number(settingsRows[0]?.min_players || 1);
  const nextMaxPlayersPerTeam = Object.prototype.hasOwnProperty.call(payload, "max_players_per_team") || Object.prototype.hasOwnProperty.call(payload, "max_players")
    ? parsePositiveNumber(
      Object.prototype.hasOwnProperty.call(payload, "max_players_per_team") ? payload.max_players_per_team : payload.max_players,
      "Max players per team",
      4
    )
    : Number(settingsRows[0]?.max_players_per_team || 4);

  if (nextMinPlayers > nextMaxPlayersPerTeam) {
    throw new HttpError(400, "Minimum players cannot be greater than maximum players per team");
  }

  const [result] = await pool.query(
    `UPDATE tournaments SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  if (!result.affectedRows) {
    throw new HttpError(404, "Tournament not found");
  }

  return getTournamentById(tournamentIdNumber);
}

async function deleteTournament(tournamentId) {
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
        DELETE player_match_stats
        FROM player_match_stats
        JOIN results ON results.id = player_match_stats.result_id
        JOIN matches ON matches.id = results.match_id
        WHERE matches.tournament_id = ?
      `,
      [tournamentIdNumber]
    );

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
      "DELETE FROM tournament_registration_requests WHERE tournament_id = ?",
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

  return withTransaction(async (connection) => registerTeamForTournament(connection, {
    tournamentId,
    teamId: resolvedTeamId
  }));
}

async function getTournamentRegistrations(tournamentId) {
  const [rows] = await pool.query(
    `
      SELECT
        teams.id,
        teams.name,
        teams.logo_url,
        COALESCE(stats.total_points, 0) AS tournament_points,
        COALESCE(stats.total_kills, 0) AS tournament_kills,
        COALESCE(stats.matches_played, 0) AS matches_played,
        users.name AS leader_name,
        users.email AS leader_email,
        COALESCE(player_counts.player_count, 0) AS player_count,
        COALESCE(registrations.disqualified, 0) AS disqualified,
        registrations.disqualification_reason
      FROM (
        SELECT DISTINCT tournament_id, team_id, COALESCE(disqualified, 0) AS disqualified, disqualification_reason
        FROM tournament_teams
        WHERE tournament_id = ?
      ) registrations
      JOIN teams ON teams.id = registrations.team_id
      LEFT JOIN users ON users.id = teams.leader_id
      LEFT JOIN (
        SELECT team_id, COUNT(*) AS player_count
        FROM players
        GROUP BY team_id
      ) player_counts ON player_counts.team_id = teams.id
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
        ON stats.tournament_id = registrations.tournament_id
        AND stats.team_id = registrations.team_id
      ORDER BY tournament_points DESC, tournament_kills DESC, teams.name ASC
    `,
    [Number(tournamentId)]
  );

  return rows.map((row) => ({
    ...row,
    tournament_points: Number(row.tournament_points || 0),
    tournament_kills: Number(row.tournament_kills || 0),
    matches_played: Number(row.matches_played || 0),
    player_count: Number(row.player_count || 0),
    disqualified: Boolean(row.disqualified)
  }));
}

async function getTournamentLeaderboard(tournamentId) {
  const [rows] = await pool.query(
    `
      SELECT
        teams.id,
        teams.name,
        teams.logo_url,
        COALESCE(stats.total_kills, 0) AS kills,
        COALESCE(stats.total_points, 0) AS points,
        COALESCE(stats.matches_played, 0) AS matches_played
      FROM (
        SELECT DISTINCT tournament_id, team_id
        FROM tournament_teams
        WHERE COALESCE(disqualified, 0) = 0
      ) registrations
      JOIN teams ON teams.id = registrations.team_id
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
        ON stats.tournament_id = registrations.tournament_id
        AND stats.team_id = registrations.team_id
      WHERE registrations.tournament_id = ?
      ORDER BY points DESC, kills DESC, teams.name ASC
    `,
    [Number(tournamentId)]
  );

  return rows.map((row) => ({
    ...row,
    kills: Number(row.kills || 0),
    points: Number(row.points || 0),
    matches_played: Number(row.matches_played || 0)
  }));
}

async function getGlobalLeaderboard() {
  const [rows] = await pool.query(
    `
      SELECT
        teams.id,
        teams.name,
        teams.logo_url,
        COALESCE(stats.total_points, 0) AS points,
        COALESCE(stats.total_kills, 0) AS kills,
        COALESCE(stats.matches_played, 0) AS matches_played
      FROM teams
      LEFT JOIN (
        SELECT
          team_id,
          COALESCE(SUM(matches_played), 0) AS matches_played,
          COALESCE(SUM(total_kills), 0) AS total_kills,
          COALESCE(SUM(total_points), 0) AS total_points
        FROM tournament_team_stats
        GROUP BY team_id
      ) stats ON stats.team_id = teams.id
      ORDER BY points DESC, kills DESC, teams.name ASC
    `
  );

  return rows.map((row) => ({
    ...row,
    points: Number(row.points || 0),
    kills: Number(row.kills || 0),
    matches_played: Number(row.matches_played || 0),
    total_points: Number(row.points || 0),
    total_kills: Number(row.kills || 0)
  }));
}

module.exports = {
  listTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  registerTeamForTournament,
  setTournamentRegistrationStatus,
  removeTournamentRegistration,
  joinTournament,
  getTournamentRegistrations,
  getTournamentLeaderboard,
  getGlobalLeaderboard
};
