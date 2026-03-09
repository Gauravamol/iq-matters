const express = require("express");
const { authenticate, optionalAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");
const {
  listTournaments,
  createTournament,
  joinTournament,
  getTournamentLeaderboard,
  getGlobalLeaderboard
} = require("../services/tournamentService");

const router = express.Router();

router.get("/tournaments", optionalAuth, asyncHandler(async (req, res) => {
  const tournaments = await listTournaments(req.user ? req.user.team_id : null);
  res.json(tournaments);
}));

router.post("/create-tournament", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const tournament = await createTournament(req.body);

  res.status(201).json({
    message: "Tournament created",
    tournament
  });
}));

router.post("/join-tournament", authenticate, asyncHandler(async (req, res) => {
  const result = await joinTournament(req.body, req.user);

  res.json({
    message: "Team joined tournament",
    ...result
  });
}));

router.get("/tournament-leaderboard/:id", asyncHandler(async (req, res) => {
  const leaderboard = await getTournamentLeaderboard(Number(req.params.id));
  res.json(leaderboard);
}));

router.get("/leaderboard/:tournament_id", asyncHandler(async (req, res) => {
  const leaderboard = await getTournamentLeaderboard(Number(req.params.tournament_id));
  res.json(leaderboard);
}));

router.get("/leaderboard", asyncHandler(async (req, res) => {
  const leaderboard = await getGlobalLeaderboard();
  res.json(leaderboard);
}));

module.exports = router;
