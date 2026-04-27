const express = require("express");
const { authenticate, optionalAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler, HttpError } = require("../utils/http");
const {
  listTournaments,
  getTournamentById,
  createTournament,
  joinTournament,
  getTournamentLeaderboard,
  getGlobalLeaderboard
} = require("../services/tournamentService");
const {
  getTournamentRegistrationContext,
  submitTournamentRegistrationRequest
} = require("../services/registrationRequestService");
const { getStatsOverview } = require("../services/statsService");

const router = express.Router();

router.get("/tournaments", optionalAuth, asyncHandler(async (req, res) => {
  const tournaments = await listTournaments(req.user ? req.user.team_id : null);
  res.json(tournaments);
}));

router.get("/tournaments/:id", optionalAuth, asyncHandler(async (req, res) => {
  const tournament = await getTournamentById(Number(req.params.id), req.user ? req.user.team_id : null);

  if (!tournament) {
    throw new HttpError(404, "Tournament not found");
  }

  res.json(tournament);
}));

router.get("/tournaments/:id/registration-form", authenticate, asyncHandler(async (req, res) => {
  const registrationContext = await getTournamentRegistrationContext(Number(req.params.id), req.user);
  res.json(registrationContext);
}));

router.post("/tournaments/:id/registration-requests", authenticate, asyncHandler(async (req, res) => {
  const result = await submitTournamentRegistrationRequest(Number(req.params.id), req.body || {}, req.user);

  res.status(201).json({
    message: result.auto_approved ? "Tournament registration approved" : "Tournament registration submitted for review",
    ...result
  });
}));

router.get("/tournaments/:id/points-table", optionalAuth, asyncHandler(async (req, res) => {
  const tournamentId = Number(req.params.id);
  const [tournament, leaderboard, stats] = await Promise.all([
    getTournamentById(tournamentId, req.user ? req.user.team_id : null),
    getTournamentLeaderboard(tournamentId),
    getStatsOverview(tournamentId)
  ]);

  if (!tournament) {
    throw new HttpError(404, "Tournament not found");
  }

  res.json({
    tournament,
    leaderboard,
    stats
  });
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
