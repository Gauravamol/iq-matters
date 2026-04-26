const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler, HttpError } = require("../utils/http");
const {
  createMatch,
  getMatchesByTournament,
  getMatchResultsByTournament,
  submitResult
} = require("../services/matchService");

const router = express.Router();

async function submitStandaloneMatchResult(payload) {
  const matchId = Number(payload.match_id);

  if (!Number.isFinite(matchId) || matchId <= 0) {
    throw new HttpError(400, "match_id is required for submitting a match result");
  }

  return submitResult({
    match_id: matchId,
    team_id: payload.team_id,
    position: payload.position ?? payload.placement,
    kills: payload.kills,
    tournament_id: payload.tournament_id
  });
}

router.get("/matches/:tournament_id/results", asyncHandler(async (req, res) => {
  const results = await getMatchResultsByTournament(Number(req.params.tournament_id));
  res.json(results);
}));

router.get("/matches/:tournament_id", asyncHandler(async (req, res) => {
  const matches = await getMatchesByTournament(Number(req.params.tournament_id));
  res.json(matches);
}));

router.post("/create-match", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const match = await createMatch(req.body);

  res.status(201).json({
    message: "Match created",
    match
  });
}));

router.post("/submit-result", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await submitResult(req.body);

  res.json({
    message: "Result submitted",
    ...result
  });
}));

router.post("/add-result", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await submitResult({
    match_id: req.body.match_id,
    team_id: req.body.team_id,
    position: req.body.position,
    kills: req.body.kills,
    tournament_id: req.body.tournament_id
  });

  res.json({
    message: "Result added",
    ...result
  });
}));

router.post("/submit-match", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await submitStandaloneMatchResult(req.body);

  res.json({
    message: "Match result added",
    ...result
  });
}));

module.exports = router;
