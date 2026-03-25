const { pool, withTransaction } = require("../config/db");
const { HttpError } = require("../utils/http");

async function getPointsSystem(connection = pool) {
  const [rows] = await connection.query(
    "SELECT position, points FROM points_system ORDER BY position ASC"
  );

  return rows;
}

async function updatePointsSystem(pointsSystem) {
  if (!Array.isArray(pointsSystem) || !pointsSystem.length) {
    throw new HttpError(400, "Points system must be a non-empty array");
  }

  return withTransaction(async (connection) => {
    for (const item of pointsSystem) {
      const position = Number(item.position);
      const points = Number(item.points);

      if (!Number.isFinite(position) || position <= 0 || !Number.isFinite(points) || points < 0) {
        throw new HttpError(400, "Each points rule requires a positive position and non-negative points");
      }

      await connection.query(
        `
          INSERT INTO points_system (position, points)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE points = VALUES(points)
        `,
        [position, points]
      );
    }

    return getPointsSystem(connection);
  });
}

async function getLeaderboardSettings(connection = pool) {
  const [rows] = await connection.query(
    "SELECT id, bg_image FROM leaderboard_settings ORDER BY id ASC LIMIT 1"
  );

  return rows[0] || { id: null, bg_image: null };
}

async function updateLeaderboardSettings(payload) {
  const bgImage = payload.bg_image ? String(payload.bg_image).trim() : null;

  return withTransaction(async (connection) => {
    const [rows] = await connection.query(
      "SELECT id FROM leaderboard_settings ORDER BY id ASC LIMIT 1"
    );

    if (rows.length) {
      await connection.query(
        "UPDATE leaderboard_settings SET bg_image = ? WHERE id = ?",
        [bgImage, rows[0].id]
      );
    } else {
      await connection.query(
        "INSERT INTO leaderboard_settings (bg_image) VALUES (?)",
        [bgImage]
      );
    }

    return getLeaderboardSettings(connection);
  });
}

async function getPlatformFeatures(connection = pool) {
  const [rows] = await connection.query(
    `
      SELECT feature_key, label, description, enabled, updated_at
      FROM platform_features
      ORDER BY label ASC
    `
  );

  return rows.map((row) => ({
    ...row,
    enabled: Boolean(row.enabled)
  }));
}

async function getPlatformFeatureMap(connection = pool) {
  const features = await getPlatformFeatures(connection);

  return features.reduce((accumulator, feature) => {
    accumulator[feature.feature_key] = feature.enabled;
    return accumulator;
  }, {});
}

async function updatePlatformFeature(featureKey, enabled) {
  const normalizedKey = String(featureKey || "").trim();

  if (!normalizedKey) {
    throw new HttpError(400, "Feature key is required");
  }

  if (typeof enabled !== "boolean") {
    throw new HttpError(400, "Enabled must be a boolean value");
  }

  const [result] = await pool.query(
    "UPDATE platform_features SET enabled = ? WHERE feature_key = ?",
    [enabled ? 1 : 0, normalizedKey]
  );

  if (!result.affectedRows) {
    throw new HttpError(404, "Platform feature not found");
  }

  const [rows] = await pool.query(
    `
      SELECT feature_key, label, description, enabled, updated_at
      FROM platform_features
      WHERE feature_key = ?
      LIMIT 1
    `,
    [normalizedKey]
  );

  return {
    ...rows[0],
    enabled: Boolean(rows[0].enabled)
  };
}

module.exports = {
  getPointsSystem,
  updatePointsSystem,
  getLeaderboardSettings,
  updateLeaderboardSettings,
  getPlatformFeatures,
  getPlatformFeatureMap,
  updatePlatformFeature
};
