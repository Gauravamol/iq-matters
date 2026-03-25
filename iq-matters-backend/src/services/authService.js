const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { HttpError } = require("../utils/http");
const { hydrateSession, signToken } = require("./sessionService");
const { sanitizeUser } = require("../utils/user");

async function getUserByEmail(email) {
  const [rows] = await pool.query(
    `
      SELECT id, name, email, password, role, team_id, created_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
}

async function registerUser({ name, email, password }) {
  const normalizedName = String(name || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    throw new HttpError(400, "Name, email, and password are required");
  }

  const existingUser = await getUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new HttpError(409, "Email already registered");
  }

  const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

  const [result] = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
    [normalizedName, normalizedEmail, hashedPassword]
  );

  const [userRows] = await pool.query(
    `
      SELECT id, name, email, role, team_id, created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [result.insertId]
  );

  return sanitizeUser(userRows[0]);
}

async function loginUser({ email, password }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  if (!normalizedEmail || !normalizedPassword) {
    throw new HttpError(400, "Email and password are required");
  }

  const user = await getUserByEmail(normalizedEmail);

  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }

  let passwordMatches = false;
  let migratePassword = false;

  if (user.password && user.password.startsWith("$2")) {
    passwordMatches = await bcrypt.compare(normalizedPassword, user.password);
  } else {
    passwordMatches = user.password === normalizedPassword;
    migratePassword = passwordMatches;
  }

  if (!passwordMatches) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (migratePassword) {
    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

    await pool.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, user.id]
    );
  }

  const token = signToken({ id: user.id });
  const session = await hydrateSession(user.id);

  return {
    token,
    ...session
  };
}

async function getCurrentSession(userId) {
  return hydrateSession(userId);
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentSession
};
