const express = require("express");
const { asyncHandler } = require("../utils/http");
const { getStatsOverview } = require("../services/statsService");

const router = express.Router();

router.get("/stats", asyncHandler(async (req, res) => {
  const stats = await getStatsOverview(req.query.tournament_id);
  res.json(stats);
}));

module.exports = router;
