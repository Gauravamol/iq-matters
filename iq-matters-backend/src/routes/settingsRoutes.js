const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");
const {
  getPointsSystem,
  updatePointsSystem,
  getLeaderboardSettings,
  updateLeaderboardSettings,
  getPlatformFeatures,
  updatePlatformFeature
} = require("../services/settingsService");

const router = express.Router();

router.get("/points-system", asyncHandler(async (req, res) => {
  const pointsSystem = await getPointsSystem();
  res.json(pointsSystem);
}));

router.put("/points-system", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const pointsSystem = await updatePointsSystem(req.body.points_system || []);

  res.json({
    message: "Points system updated",
    pointsSystem
  });
}));

router.get("/leaderboard-settings", asyncHandler(async (req, res) => {
  const settings = await getLeaderboardSettings();
  res.json(settings);
}));

router.put("/leaderboard-settings", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const settings = await updateLeaderboardSettings(req.body);

  res.json({
    message: "Leaderboard settings updated",
    settings
  });
}));

router.get("/platform-features", asyncHandler(async (req, res) => {
  const features = await getPlatformFeatures();
  res.json(features);
}));

router.patch("/admin/platform-features/:key", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const feature = await updatePlatformFeature(req.params.key, Boolean(req.body.enabled));

  res.json({
    message: "Platform feature updated",
    feature
  });
}));

module.exports = router;
