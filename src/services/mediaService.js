const { pool } = require("../config/db");
const { HttpError } = require("../utils/http");

const supportedMediaSlots = new Set([
  "home",
  "tournaments",
  "matches",
  "leaderboard",
  "dashboard",
  "team-dashboard",
  "home-video",
  "tournaments-video"
]);

function normalizePageName(pageName) {
  const normalizedPage = String(pageName || "").trim().toLowerCase();

  if (!supportedMediaSlots.has(normalizedPage)) {
    throw new HttpError(400, "Unsupported media slot");
  }

  return normalizedPage;
}

function normalizeMediaType(mediaType) {
  const normalizedType = String(mediaType || "").trim().toLowerCase();

  if (!["image", "video"].includes(normalizedType)) {
    throw new HttpError(400, "Media type must be image or video");
  }

  return normalizedType;
}

function normalizeUrl(url) {
  const normalizedUrl = String(url || "").trim();

  if (!normalizedUrl) {
    throw new HttpError(400, "Media URL is required");
  }

  if (normalizedUrl.length > 255) {
    throw new HttpError(400, "Media URL must be 255 characters or fewer");
  }

  return normalizedUrl;
}

async function getMediaAssetById(id, connection = pool) {
  const [rows] = await connection.query(
    `
      SELECT id, page_name, media_type, url, created_at
      FROM media_assets
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function getMediaForPage(pageName, connection = pool) {
  const normalizedPage = normalizePageName(pageName);
  const [rows] = await connection.query(
    `
      SELECT id, page_name, media_type, url, created_at
      FROM media_assets
      WHERE page_name = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [normalizedPage]
  );

  return {
    page: normalizedPage,
    asset: rows[0] || null
  };
}

async function createMediaAsset(payload, connection = pool) {
  const pageName = normalizePageName(payload.page_name);
  const mediaType = normalizeMediaType(payload.media_type);
  const url = normalizeUrl(payload.url);

  const [result] = await connection.query(
    `
      INSERT INTO media_assets (page_name, media_type, url)
      VALUES (?, ?, ?)
    `,
    [pageName, mediaType, url]
  );

  return getMediaAssetById(result.insertId, connection);
}

async function deleteMediaAsset(id, connection = pool) {
  const mediaId = Number(id);

  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    throw new HttpError(400, "Valid media asset id is required");
  }

  const existingAsset = await getMediaAssetById(mediaId, connection);

  if (!existingAsset) {
    throw new HttpError(404, "Media asset not found");
  }

  await connection.query("DELETE FROM media_assets WHERE id = ?", [mediaId]);

  return existingAsset;
}

module.exports = {
  getMediaForPage,
  createMediaAsset,
  deleteMediaAsset
};
