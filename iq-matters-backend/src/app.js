const cors = require("cors");
const express = require("express");
const env = require("./config/env");
const { pool } = require("./config/db");
const { bootstrapDatabase } = require("./db/bootstrap");
const authRoutes = require("./routes/authRoutes");
const teamRoutes = require("./routes/teamRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const matchRoutes = require("./routes/matchRoutes");
const adminRoutes = require("./routes/adminRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const externalRoutes = require("./routes/externalRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const statsRoutes = require("./routes/statsRoutes");

function createExpressApp() {
  const app = express();
  const corsOptions = env.corsOrigins.length
    ? {
        origin(origin, callback) {
          if (!origin || env.corsOrigins.includes(origin)) {
            callback(null, true);
            return;
          }

          const error = new Error("Origin not allowed by CORS");
          error.status = 403;
          callback(error);
        }
      }
    : undefined;

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "20mb" }));
  app.use("/uploads", express.static(env.uploadRoot));

  app.get("/", (req, res) => {
    res.json({
      message: "IQ Matters API running"
    });
  });

  app.get("/health", (req, res) => {
    res.json({
      status: "ok"
    });
  });

  app.use(authRoutes);
  app.use(teamRoutes);
  app.use(tournamentRoutes);
  app.use(matchRoutes);
  app.use(adminRoutes);
  app.use(mediaRoutes);
  app.use(uploadRoutes);
  app.use(externalRoutes);
  app.use(settingsRoutes);
  app.use(statsRoutes);

  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const payload = {
      message: err.message || "Internal server error"
    };

    if (!env.isProduction && err.details) {
      payload.details = err.details;
    }

    if (!env.isProduction && status === 500 && err.stack) {
      payload.stack = err.stack;
    }

    res.status(status).json(payload);
  });

  return app;
}

async function createApp() {
  await bootstrapDatabase(pool);
  return createExpressApp();
}

async function startServer() {
  const app = await createApp();

  return app.listen(env.port, () => {
    console.log(`IQ Matters API listening on port ${env.port}`);
  });
}

module.exports = {
  createExpressApp,
  createApp,
  startServer
};
