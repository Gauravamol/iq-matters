const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const env = require("../config/env");
const { pool } = require("../config/db");
const { HttpError } = require("../utils/http");

const uploadRoot = env.uploadRoot;
const uploadStorage = env.uploadStorage;
const maxUploadBytes = 10 * 1024 * 1024;

const extensionByMimeType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
  "image/x-icon": ".ico",
  "image/avif": ".avif",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "video/x-matroska": ".mkv",
  "video/x-m4v": ".m4v"
};

const supportedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
  ".avif",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".m4v"
]);

function normalizeKind(kind) {
  const normalizedKind = String(kind || "misc").trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
  return normalizedKind || "misc";
}

function normalizeMimeType(mimeType) {
  return String(mimeType || "").trim().toLowerCase();
}

function normalizeOriginalName(fileName) {
  const normalizedName = String(fileName || "").trim();

  if (!normalizedName) {
    throw new HttpError(400, "File name is required");
  }

  return normalizedName;
}

function resolveExtension(fileName, mimeType) {
  const directExtension = path.extname(fileName || "").toLowerCase();

  if (supportedExtensions.has(directExtension)) {
    return directExtension;
  }

  const extensionFromMimeType = extensionByMimeType[mimeType] || "";

  if (supportedExtensions.has(extensionFromMimeType)) {
    return extensionFromMimeType;
  }

  throw new HttpError(400, "Unsupported file type");
}

function parseDataUrl(dataUrl) {
  const normalizedValue = String(dataUrl || "").trim();

  if (!normalizedValue) {
    throw new HttpError(400, "File data is required");
  }

  const match = normalizedValue.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new HttpError(400, "File data must be a valid base64 data URL");
  }

  return {
    mimeType: normalizeMimeType(match[1]),
    base64Value: match[2]
  };
}

function sanitizeStem(value) {
  return String(value || "file")
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "file";
}

function toAbsoluteUploadUrl(req, relativeUrl) {
  if (env.publicBaseUrl) {
    return new URL(relativeUrl.replace(/^\//, ""), env.publicBaseUrl).toString();
  }

  return new URL(relativeUrl, `${req.protocol}://${req.get("host")}`).toString();
}

async function saveUploadedFile(payload) {
  const originalName = normalizeOriginalName(payload.file_name || payload.fileName);
  const parsedDataUrl = parseDataUrl(payload.data_url || payload.dataUrl);
  const providedMimeType = normalizeMimeType(payload.mime_type || payload.mimeType);
  const mimeType = parsedDataUrl.mimeType || providedMimeType;
  const extension = resolveExtension(originalName, mimeType);
  const kind = normalizeKind(payload.kind);
  let buffer;

  try {
    buffer = Buffer.from(parsedDataUrl.base64Value, "base64");
  } catch (error) {
    throw new HttpError(400, "Unable to decode the uploaded file");
  }

  if (!buffer.length) {
    throw new HttpError(400, "Uploaded file is empty");
  }

  if (buffer.length > maxUploadBytes) {
    throw new HttpError(413, "Uploaded file must be 10 MB or smaller");
  }

  const uniqueName = `${Date.now()}-${sanitizeStem(originalName)}-${crypto.randomBytes(6).toString("hex")}${extension}`;

  if (uploadStorage === "database") {
    const [result] = await pool.query(
      `
        INSERT INTO uploaded_files (kind, stored_name, original_name, mime_type, size, content)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [kind, uniqueName, originalName, mimeType || providedMimeType || "application/octet-stream", buffer.length, buffer]
    );

    return {
      original_name: originalName,
      mime_type: mimeType || providedMimeType || "application/octet-stream",
      size: buffer.length,
      relative_url: `/uploads/files/${result.insertId}/${encodeURIComponent(uniqueName)}`
    };
  }

  const directoryPath = path.join(uploadRoot, kind);
  await fs.mkdir(directoryPath, { recursive: true });

  const filePath = path.join(directoryPath, uniqueName);
  await fs.writeFile(filePath, buffer);

  return {
    original_name: originalName,
    mime_type: mimeType || providedMimeType || "application/octet-stream",
    size: buffer.length,
    relative_url: `/uploads/${kind}/${uniqueName}`
  };
}

async function getUploadedFile(fileId) {
  const normalizedFileId = Number(fileId);

  if (!Number.isInteger(normalizedFileId) || normalizedFileId <= 0) {
    throw new HttpError(400, "Valid file id is required");
  }

  const [rows] = await pool.query(
    `
      SELECT id, stored_name, original_name, mime_type, size, content, created_at
      FROM uploaded_files
      WHERE id = ?
      LIMIT 1
    `,
    [normalizedFileId]
  );

  if (!rows.length) {
    throw new HttpError(404, "Uploaded file not found");
  }

  return rows[0];
}

module.exports = {
  uploadRoot,
  toAbsoluteUploadUrl,
  saveUploadedFile,
  getUploadedFile
};
