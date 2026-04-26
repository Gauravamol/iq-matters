const path = require("path");

require("dotenv").config({
  path: path.resolve(process.cwd(), ".env"),
  quiet: true
});

function readList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function readNumber(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function normalizeBaseUrl(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.endsWith("/") ? normalizedValue : `${normalizedValue}/`;
}

function readSslConfig() {
  const sslEnabled = readBoolean(process.env.DB_SSL, false);
  const ca = process.env.DB_SSL_CA ? process.env.DB_SSL_CA.replace(/\\n/g, "\n") : "";
  const rejectUnauthorized = readBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);

  if (!sslEnabled && !ca) {
    return undefined;
  }

  return {
    rejectUnauthorized,
    ...(ca ? { ca } : {})
  };
}

function readDatabaseConfig() {
  const config = {
    host: process.env.DB_HOST || "localhost",
    port: readNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "iq_matters",
    waitForConnections: true,
    connectionLimit: readNumber(process.env.DB_CONNECTION_LIMIT, 10),
    namedPlaceholders: true
  };

  if (process.env.DATABASE_URL) {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    const sslMode = String(databaseUrl.searchParams.get("ssl-mode") || databaseUrl.searchParams.get("sslmode") || "").toLowerCase();

    config.host = databaseUrl.hostname || config.host;
    config.port = readNumber(databaseUrl.port, config.port);
    config.user = decodeURIComponent(databaseUrl.username || config.user);
    config.password = decodeURIComponent(databaseUrl.password || config.password);
    config.database = decodeURIComponent(databaseUrl.pathname.replace(/^\//, "") || config.database);

    if (sslMode && !["disable", "disabled", "false"].includes(sslMode)) {
      process.env.DB_SSL = "true";
    }
  }

  const ssl = readSslConfig();

  if (ssl) {
    config.ssl = ssl;
  }

  return config;
}

function readUploadStorage() {
  const storage = String(process.env.UPLOAD_STORAGE || "").trim().toLowerCase();

  if (["filesystem", "database"].includes(storage)) {
    return storage;
  }

  return process.env.NODE_ENV === "production" ? "database" : "filesystem";
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  db: readDatabaseConfig(),
  jwtSecret: process.env.JWT_SECRET || "iq-matters-local-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminBootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL || "gaurav@test.com",
  pandaScoreBaseUrl: process.env.PANDASCORE_BASE_URL || "https://api.pandascore.co",
  pandaScoreApiKey: process.env.PANDASCORE_API_KEY || "",
  corsOrigins: readList(process.env.CORS_ORIGIN),
  publicBaseUrl: normalizeBaseUrl(process.env.PUBLIC_BASE_URL),
  trustProxy: readBoolean(process.env.TRUST_PROXY, process.env.NODE_ENV === "production"),
  uploadRoot: path.resolve(process.cwd(), process.env.UPLOAD_ROOT || "uploads"),
  uploadStorage: readUploadStorage(),
  isProduction: process.env.NODE_ENV === "production"
};
