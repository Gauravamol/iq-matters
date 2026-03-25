const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const env = require("../config/env");
const { HttpError } = require("../utils/http");
const { sanitizeUser } = require("../utils/user");

async function loadAuthenticatedUser(userId) {
  const [rows] = await pool.query(
    `
      SELECT id, name, email, password, role, team_id, created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

async function hydrateSession(userId) {
  const user = await loadAuthenticatedUser(userId);

  if (!user) {
    throw new HttpError(401, "User account no longer exists");
  }

  let team = null;
  let joinedTournamentIds = [];

  if (user.team_id) {
    const [teamRows] = await pool.query(
      `
        SELECT id, name, logo_url, leader_id, total_points, total_kills, matches_played
        FROM teams
        WHERE id = ?
        LIMIT 1
      `,
      [user.team_id]
    );

    team = teamRows[0] || null;

    const [registrationRows] = await pool.query(
      `
        SELECT tournament_id
        FROM tournament_teams
        WHERE team_id = ? AND COALESCE(disqualified, 0) = 0
        ORDER BY tournament_id ASC
      `,
      [user.team_id]
    );

    joinedTournamentIds = registrationRows.map((row) => row.tournament_id);
  }

  return {
    user: sanitizeUser(user),
    team,
    joinedTournamentIds
  };
}

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn
    }
  );
}

module.exports = {
  loadAuthenticatedUser,
  hydrateSession,
  signToken
};
