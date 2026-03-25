const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { HttpError } = require("../utils/http");
const { loadAuthenticatedUser } = require("../services/sessionService");
const { sanitizeUser } = require("../utils/user");

async function attachUser(req, strict) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    if (strict) {
      throw new HttpError(401, "Authentication required");
    }

    req.user = null;
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await loadAuthenticatedUser(payload.userId);

    if (!user) {
      throw new HttpError(401, "Authentication required");
    }

    req.user = sanitizeUser(user);
  } catch (error) {
    if (!strict) {
      req.user = null;
      return;
    }

    throw new HttpError(401, "Invalid or expired token");
  }
}

function authenticate(req, res, next) {
  attachUser(req, true).then(() => next()).catch(next);
}

function optionalAuth(req, res, next) {
  attachUser(req, false).then(() => next()).catch(next);
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(new HttpError(403, "Admin access required"));
  }

  return next();
}

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin
};

