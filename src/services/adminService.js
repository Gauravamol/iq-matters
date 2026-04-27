const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { HttpError } = require("../utils/http");

async function getDashboardStats() {
  const [teamRows] = await pool.query("SELECT COUNT(*) AS total_teams FROM teams");
  const [tournamentRows] = await pool.query(
    "SELECT COUNT(*) AS total_tournaments, COALESCE(SUM(prize_pool), 0) AS total_prize_pool FROM tournaments"
  );
  const [matchRows] = await pool.query("SELECT COUNT(*) AS total_matches FROM matches");
  const [userRows] = await pool.query("SELECT COUNT(*) AS total_users FROM users");

  const totalTournaments = Number(tournamentRows[0].total_tournaments || 0);
  const totalMatches = Number(matchRows[0].total_matches || 0);

  return {
    total_teams: Number(teamRows[0].total_teams || 0),
    total_tournaments: totalTournaments,
    total_matches: totalMatches,
    total_prize_pool: Number(tournamentRows[0].total_prize_pool || 0),
    total_users: Number(userRows[0].total_users || 0),
    active_tournaments: totalTournaments,
    matches_today: totalMatches
  };
}

async function getUsers() {
  const [rows] = await pool.query(
    `
      SELECT users.id, users.name, users.email, users.role, users.team_id, users.created_at, teams.name AS team_name
      FROM users
      LEFT JOIN teams ON teams.id = users.team_id
      ORDER BY users.id ASC
    `
  );

  return rows;
}

function normalizeRole(role) {
  const normalizedRole = String(role || "user").trim();

  if (!["admin", "user"].includes(normalizedRole)) {
    throw new HttpError(400, "Role must be either admin or user");
  }

  return normalizedRole;
}

async function createUser(payload) {
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const role = normalizeRole(payload.role || "user");

  if (!name || !email || !password) {
    throw new HttpError(400, "Name, email, and password are required");
  }

  const [existingRows] = await pool.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (existingRows.length) {
    throw new HttpError(409, "Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    [name, email, hashedPassword, role]
  );

  const [rows] = await pool.query(
    "SELECT id, name, email, role, team_id, created_at FROM users WHERE id = ? LIMIT 1",
    [result.insertId]
  );

  return rows[0];
}

async function updateUser(userId, payload) {
  const userIdNumber = Number(userId);
  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    const name = String(payload.name || "").trim();

    if (!name) {
      throw new HttpError(400, "Name is required");
    }

    updates.push("name = ?");
    values.push(name);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "email")) {
    const email = String(payload.email || "").trim().toLowerCase();

    if (!email) {
      throw new HttpError(400, "Email is required");
    }

    const [existingRows] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [email, userIdNumber]
    );

    if (existingRows.length) {
      throw new HttpError(409, "Email already registered");
    }

    updates.push("email = ?");
    values.push(email);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "role")) {
    updates.push("role = ?");
    values.push(normalizeRole(payload.role));
  }

  if (!updates.length) {
    throw new HttpError(400, "No user updates were provided");
  }

  values.push(userIdNumber);

  const [result] = await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  if (!result.affectedRows) {
    throw new HttpError(404, "User not found");
  }

  const [rows] = await pool.query(
    "SELECT id, name, email, role, team_id, created_at FROM users WHERE id = ? LIMIT 1",
    [userIdNumber]
  );

  return rows[0];
}

async function updateUserRole(userId, role) {
  return updateUser(userId, { role });
}

async function deleteUser(userId) {
  const userIdNumber = Number(userId);
  const [userRows] = await pool.query(
    "SELECT id, name, email, role, team_id, created_at FROM users WHERE id = ? LIMIT 1",
    [userIdNumber]
  );

  const user = userRows[0];

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const [teamRows] = await pool.query(
    "SELECT id FROM teams WHERE leader_id = ? LIMIT 1",
    [userIdNumber]
  );

  if (teamRows.length) {
    throw new HttpError(409, "This user leads a team. Reassign or delete the team first.");
  }

  await pool.query(
    "DELETE FROM users WHERE id = ?",
    [userIdNumber]
  );

  return user;
}

module.exports = {
  getDashboardStats,
  getUsers,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser
};
