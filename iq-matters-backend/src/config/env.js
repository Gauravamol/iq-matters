const path = require("path");

require("dotenv").config({
  path: path.resolve(process.cwd(), ".env")
});

module.exports = {
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "iq_matters",
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
  },
  jwtSecret: process.env.JWT_SECRET || "iq-matters-local-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminBootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL || "gaurav@test.com",
  pandaScoreBaseUrl: process.env.PANDASCORE_BASE_URL || "https://api.pandascore.co",
  pandaScoreApiKey: process.env.PANDASCORE_API_KEY || "",
  isProduction: process.env.NODE_ENV === "production"
};
