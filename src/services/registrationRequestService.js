const { pool, withTransaction } = require("../config/db");
const { HttpError } = require("../utils/http");
const { registerTeamForTournament } = require("./tournamentService");

function normalizeLogoUrl(value) {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || null;
}

function normalizeContact(value) {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || null;
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

function parsePlayersJson(value) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    return [];
  }
}

function normalizeSubmittedPlayer(player, index, allowPlayerLogo) {
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
    logo_url: allowPlayerLogo ? normalizeLogoUrl(player.logo_url || player.logo) : null
  };
}

function normalizeSubmittedPlayers(players, allowPlayerLogo) {
  if (!Array.isArray(players)) {
    return [];
  }

  const seenPlayerUids = new Set();
  const normalizedPlayers = [];

  players.forEach((player, index) => {
    const normalizedPlayer = normalizeSubmittedPlayer(player, index, allowPlayerLogo);

    if (!normalizedPlayer) {
      return;
    }

    const lookupKey = normalizedPlayer.player_uid.toLowerCase();

    if (seenPlayerUids.has(lookupKey)) {
      return;
    }

    seenPlayerUids.add(lookupKey);
    normalizedPlayers.push(normalizedPlayer);
  });

  return normalizedPlayers;
}

function normalizeTournamentSettings(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    max_teams: Number(row.max_teams || 0),
    min_players: Number(row.min_players || 1),
    max_players_per_team: Number(row.max_players_per_team || 4),
    joined_teams: Number(row.joined_teams || 0),
    pending_requests: Number(row.pending_requests || 0),
    show_contact_email_field: Boolean(row.show_contact_email_field),
    show_contact_discord_field: Boolean(row.show_contact_discord_field),
    show_contact_phone_field: Boolean(row.show_contact_phone_field),
    allow_team_logo: Boolean(row.allow_team_logo),
    allow_player_logo: Boolean(row.allow_player_logo),
    require_admin_approval: Boolean(row.require_admin_approval)
  };
}

function normalizeRequestRow(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    submitted_team_id: row.submitted_team_id ? Number(row.submitted_team_id) : null,
    approved_team_id: row.approved_team_id ? Number(row.approved_team_id) : null,
    player_count: Number(row.player_count || 0),
    players: parsePlayersJson(row.players_json)
  };
}

async function loadTournamentSettings(connection, tournamentId) {
  const [rows] = await connection.query(
    `
      SELECT
        tournaments.id,
        tournaments.name,
        tournaments.date,
        tournaments.status,
        tournaments.max_teams,
        COALESCE(tournaments.min_players, 1) AS min_players,
        COALESCE(tournaments.max_players_per_team, 4) AS max_players_per_team,
        COALESCE(tournaments.show_contact_email_field, 1) AS show_contact_email_field,
        COALESCE(tournaments.show_contact_discord_field, 0) AS show_contact_discord_field,
        COALESCE(tournaments.show_contact_phone_field, 0) AS show_contact_phone_field,
        COALESCE(tournaments.allow_team_logo, 1) AS allow_team_logo,
        COALESCE(tournaments.allow_player_logo, 1) AS allow_player_logo,
        COALESCE(tournaments.require_admin_approval, 1) AS require_admin_approval,
        COALESCE(approved_registrations.joined_teams, 0) AS joined_teams,
        COALESCE(pending_registrations.pending_requests, 0) AS pending_requests
      FROM tournaments
      LEFT JOIN (
        SELECT tournament_id, COUNT(*) AS joined_teams
        FROM tournament_teams
        WHERE COALESCE(disqualified, 0) = 0
        GROUP BY tournament_id
      ) approved_registrations ON approved_registrations.tournament_id = tournaments.id
      LEFT JOIN (
        SELECT tournament_id, COUNT(*) AS pending_requests
        FROM tournament_registration_requests
        WHERE status = 'pending'
        GROUP BY tournament_id
      ) pending_registrations ON pending_registrations.tournament_id = tournaments.id
      WHERE tournaments.id = ?
      LIMIT 1
    `,
    [Number(tournamentId)]
  );

  return normalizeTournamentSettings(rows[0] || null);
}

async function loadTeamWithPlayers(connection, teamId) {
  const [teamRows] = await connection.query(
    `
      SELECT id, name, logo_url, leader_id
      FROM teams
      WHERE id = ?
      LIMIT 1
    `,
    [Number(teamId)]
  );

  if (!teamRows.length) {
    return null;
  }

  const [playerRows] = await connection.query(
    `
      SELECT id, team_id, player_name, player_uid, logo_url
      FROM players
      WHERE team_id = ?
      ORDER BY id ASC
    `,
    [Number(teamId)]
  );

  return {
    team: teamRows[0],
    players: playerRows
  };
}

async function loadApprovedRegistration(connection, tournamentId, teamId) {
  if (!teamId) {
    return null;
  }

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

async function loadLatestViewerRequest(connection, tournamentId, actingUser) {
  if (!actingUser) {
    return null;
  }

  const viewerUserId = Number(actingUser.id);
  const viewerTeamId = Number(actingUser.team_id || 0);
  const [rows] = await connection.query(
    `
      SELECT
        requests.*,
        users.name AS requester_name,
        users.email AS requester_email
      FROM tournament_registration_requests requests
      JOIN users ON users.id = requests.submitted_by_user_id
      WHERE requests.tournament_id = ?
        AND (
          requests.submitted_by_user_id = ?
          OR (? > 0 AND requests.submitted_team_id = ?)
        )
      ORDER BY requests.id DESC
      LIMIT 1
    `,
    [Number(tournamentId), viewerUserId, viewerTeamId, viewerTeamId]
  );

  return normalizeRequestRow(rows[0] || null);
}

async function loadRequestById(connection, requestId) {
  const [rows] = await connection.query(
    `
      SELECT
        requests.*,
        tournaments.name AS tournament_name,
        tournaments.status AS tournament_status,
        tournaments.max_teams,
        COALESCE(tournaments.min_players, 1) AS min_players,
        COALESCE(tournaments.max_players_per_team, 4) AS max_players_per_team,
        COALESCE(tournaments.show_contact_email_field, 1) AS show_contact_email_field,
        COALESCE(tournaments.show_contact_discord_field, 0) AS show_contact_discord_field,
        COALESCE(tournaments.show_contact_phone_field, 0) AS show_contact_phone_field,
        COALESCE(tournaments.allow_team_logo, 1) AS allow_team_logo,
        COALESCE(tournaments.allow_player_logo, 1) AS allow_player_logo,
        COALESCE(tournaments.require_admin_approval, 1) AS require_admin_approval,
        users.name AS requester_name,
        users.email AS requester_email
      FROM tournament_registration_requests requests
      JOIN tournaments ON tournaments.id = requests.tournament_id
      JOIN users ON users.id = requests.submitted_by_user_id
      WHERE requests.id = ?
      LIMIT 1
    `,
    [Number(requestId)]
  );

  const request = normalizeRequestRow(rows[0] || null);

  if (!request) {
    return null;
  }

  return {
    ...request,
    tournament: normalizeTournamentSettings({
      ...rows[0],
      id: rows[0].tournament_id,
      name: rows[0].tournament_name,
      status: rows[0].tournament_status,
      joined_teams: 0,
      pending_requests: 0
    })
  };
}

function validatePlayerRange(playerCount, tournament) {
  if (playerCount < Number(tournament.min_players || 1)) {
    throw new HttpError(400, `At least ${tournament.min_players} players are required`);
  }

  if (playerCount > Number(tournament.max_players_per_team || 4)) {
    throw new HttpError(400, `A maximum of ${tournament.max_players_per_team} players are allowed`);
  }
}

async function ensureRequestCapacity(connection, tournamentId, maxTeams, requestIdToIgnore = null) {
  if (!Number(maxTeams || 0)) {
    return;
  }

  const [approvedRows] = await connection.query(
    `
      SELECT COUNT(*) AS count
      FROM tournament_teams
      WHERE tournament_id = ? AND COALESCE(disqualified, 0) = 0
    `,
    [Number(tournamentId)]
  );

  const pendingQuery = requestIdToIgnore
    ? `
        SELECT COUNT(*) AS count
        FROM tournament_registration_requests
        WHERE tournament_id = ?
          AND status = 'pending'
          AND id <> ?
      `
    : `
        SELECT COUNT(*) AS count
        FROM tournament_registration_requests
        WHERE tournament_id = ?
          AND status = 'pending'
      `;
  const [pendingRows] = await connection.query(
    pendingQuery,
    requestIdToIgnore ? [Number(tournamentId), Number(requestIdToIgnore)] : [Number(tournamentId)]
  );

  const totalReservedSlots = Number(approvedRows[0]?.count || 0) + Number(pendingRows[0]?.count || 0);

  if (totalReservedSlots >= Number(maxTeams)) {
    throw new HttpError(409, "Tournament registrations are full");
  }
}

async function createTeamFromRequest(connection, request) {
  const leaderId = Number(request.submitted_by_user_id);
  const [leaderRows] = await connection.query(
    "SELECT id, team_id FROM users WHERE id = ? LIMIT 1",
    [leaderId]
  );

  const leader = leaderRows[0];

  if (!leader) {
    throw new HttpError(404, "Requesting user no longer exists");
  }

  if (leader.team_id) {
    throw new HttpError(409, "Requesting user already belongs to a team");
  }

  const [teamResult] = await connection.query(
    `
      INSERT INTO teams (name, logo_url, leader_id, total_points, total_kills, matches_played)
      VALUES (?, ?, ?, 0, 0, 0)
    `,
    [request.team_name, normalizeLogoUrl(request.team_logo_url), leaderId]
  );

  const teamId = teamResult.insertId;

  for (const player of request.players) {
    await connection.query(
      "INSERT INTO players (team_id, player_name, player_uid, logo_url) VALUES (?, ?, ?, ?)",
      [teamId, player.player_name, player.player_uid, normalizeLogoUrl(player.logo_url)]
    );
  }

  await connection.query(
    "UPDATE users SET team_id = ? WHERE id = ?",
    [teamId, leaderId]
  );

  return teamId;
}

async function approveRequestInTransaction(connection, requestId, decisionReason) {
  const request = await loadRequestById(connection, requestId);

  if (!request) {
    throw new HttpError(404, "Registration request not found");
  }

  if (request.status === "approved") {
    throw new HttpError(409, "Registration request is already approved");
  }

  if (request.tournament.status !== "upcoming") {
    throw new HttpError(409, "Tournament registration is only available for upcoming tournaments");
  }

  await ensureRequestCapacity(connection, request.tournament_id, request.tournament.max_teams, request.id);

  const teamId = request.submitted_team_id
    ? Number(request.submitted_team_id)
    : await createTeamFromRequest(connection, request);

  await registerTeamForTournament(connection, {
    tournamentId: Number(request.tournament_id),
    teamId
  });

  await connection.query(
    `
      UPDATE tournament_registration_requests
      SET
        status = 'approved',
        approved_team_id = ?,
        decision_reason = ?,
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [teamId, decisionReason, Number(requestId)]
  );

  return loadRequestById(connection, requestId);
}

async function getTournamentRegistrationContext(tournamentId, actingUser) {
  const connection = await pool.getConnection();

  try {
    const tournament = await loadTournamentSettings(connection, tournamentId);

    if (!tournament) {
      throw new HttpError(404, "Tournament not found");
    }

    const existingTeam = actingUser?.team_id
      ? await loadTeamWithPlayers(connection, Number(actingUser.team_id))
      : null;
    const existingRegistration = actingUser?.team_id
      ? await loadApprovedRegistration(connection, tournamentId, actingUser.team_id)
      : null;
    const latestRequest = await loadLatestViewerRequest(connection, tournamentId, actingUser);

    return {
      tournament,
      team: existingTeam ? {
        ...existingTeam.team,
        players: existingTeam.players
      } : null,
      existing_registration: existingRegistration ? {
        ...existingRegistration,
        disqualified: Boolean(existingRegistration.disqualified)
      } : null,
      latest_request: latestRequest,
      can_submit_new_request: !existingRegistration && latestRequest?.status !== "pending"
    };
  } finally {
    connection.release();
  }
}

async function submitTournamentRegistrationRequest(tournamentId, payload, actingUser) {
  if (!actingUser) {
    throw new HttpError(401, "Authentication required");
  }

  return withTransaction(async (connection) => {
    const tournament = await loadTournamentSettings(connection, tournamentId);

    if (!tournament) {
      throw new HttpError(404, "Tournament not found");
    }

    if (tournament.status !== "upcoming") {
      throw new HttpError(409, "Tournament registration is only open for upcoming tournaments");
    }

    const latestRequest = await loadLatestViewerRequest(connection, tournamentId, actingUser);

    if (latestRequest?.status === "pending") {
      throw new HttpError(409, "A registration request is already pending for this tournament");
    }

    await ensureRequestCapacity(connection, tournamentId, tournament.max_teams);

    const viewerTeamId = Number(actingUser.team_id || 0);
    const useExistingTeam = Boolean(viewerTeamId && parseBooleanFlag(payload.use_existing_team, Boolean(viewerTeamId)));

    if (!useExistingTeam && viewerTeamId) {
      throw new HttpError(409, "Your account already belongs to a team. Use the existing team registration flow.");
    }

    const existingApprovedRegistration = viewerTeamId
      ? await loadApprovedRegistration(connection, tournamentId, viewerTeamId)
      : null;

    if (existingApprovedRegistration && !existingApprovedRegistration.disqualified) {
      throw new HttpError(409, "Your team is already registered for this tournament");
    }

    let submittedTeamId = null;
    let teamName = "";
    let teamLogoUrl = null;
    let players = [];

    if (useExistingTeam) {
      const team = await loadTeamWithPlayers(connection, viewerTeamId);

      if (!team) {
        throw new HttpError(404, "Your team could not be found");
      }

      submittedTeamId = Number(team.team.id);
      teamName = String(team.team.name || "").trim();
      teamLogoUrl = tournament.allow_team_logo ? normalizeLogoUrl(team.team.logo_url) : null;
      players = team.players.map((player) => ({
        player_name: String(player.player_name || "").trim() || "Player",
        player_uid: String(player.player_uid || "").trim(),
        logo_url: tournament.allow_player_logo ? normalizeLogoUrl(player.logo_url) : null
      }));
    } else {
      teamName = String(payload.team_name || "").trim();
      teamLogoUrl = tournament.allow_team_logo ? normalizeLogoUrl(payload.team_logo_url) : null;
      players = normalizeSubmittedPlayers(payload.players, tournament.allow_player_logo);

      if (!teamName) {
        throw new HttpError(400, "Team name is required");
      }
    }

    validatePlayerRange(players.length, tournament);

    const [result] = await connection.query(
      `
        INSERT INTO tournament_registration_requests (
          tournament_id,
          submitted_by_user_id,
          submitted_team_id,
          team_name,
          team_logo_url,
          player_count,
          players_json,
          contact_email,
          contact_discord,
          contact_phone,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(tournamentId),
        Number(actingUser.id),
        submittedTeamId,
        teamName,
        teamLogoUrl,
        players.length,
        JSON.stringify(players),
        tournament.show_contact_email_field ? normalizeContact(payload.contact_email) : null,
        tournament.show_contact_discord_field ? normalizeContact(payload.contact_discord) : null,
        tournament.show_contact_phone_field ? normalizeContact(payload.contact_phone) : null,
        "pending"
      ]
    );

    if (!tournament.require_admin_approval) {
      const approvedRequest = await approveRequestInTransaction(connection, result.insertId, "Auto-approved");

      return {
        auto_approved: true,
        request: approvedRequest
      };
    }

    return {
      auto_approved: false,
      request: await loadRequestById(connection, result.insertId)
    };
  });
}

async function listTournamentRegistrationRequests(tournamentId) {
  const [rows] = await pool.query(
    `
      SELECT
        requests.*,
        users.name AS requester_name,
        users.email AS requester_email,
        approved_teams.name AS approved_team_name
      FROM tournament_registration_requests requests
      JOIN users ON users.id = requests.submitted_by_user_id
      LEFT JOIN teams approved_teams ON approved_teams.id = requests.approved_team_id
      WHERE requests.tournament_id = ?
      ORDER BY
        CASE requests.status
          WHEN 'pending' THEN 0
          WHEN 'declined' THEN 1
          ELSE 2
        END,
        requests.created_at DESC
    `,
    [Number(tournamentId)]
  );

  return rows.map(normalizeRequestRow);
}

async function reviewTournamentRegistrationRequest(requestId, payload) {
  const nextStatus = String(payload?.status || "").trim().toLowerCase();
  const decisionReason = String(payload?.decision_reason || payload?.reason || "").trim() || null;

  if (!["approved", "declined"].includes(nextStatus)) {
    throw new HttpError(400, "Registration request status must be approved or declined");
  }

  return withTransaction(async (connection) => {
    const request = await loadRequestById(connection, requestId);

    if (!request) {
      throw new HttpError(404, "Registration request not found");
    }

    if (nextStatus === "approved") {
      return approveRequestInTransaction(connection, requestId, decisionReason || "Approved by admin");
    }

    await connection.query(
      `
        UPDATE tournament_registration_requests
        SET
          status = 'declined',
          decision_reason = ?,
          reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [decisionReason || "Declined by admin", Number(requestId)]
    );

    return loadRequestById(connection, requestId);
  });
}

module.exports = {
  getTournamentRegistrationContext,
  submitTournamentRegistrationRequest,
  listTournamentRegistrationRequests,
  reviewTournamentRegistrationRequest
};
