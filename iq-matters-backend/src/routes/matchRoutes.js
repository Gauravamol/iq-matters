const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler, HttpError } = require("../utils/http");
const { pool } = require("../config/db");
const { getPlacementPointsMap, calculateMatchPoints } = require("../services/scoringService");
const {
  createMatch,
  getMatchesByTournament,
  submitResult
} = require("../services/matchService");

const router = express.Router();

function toPositiveNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive number`);
  }

  return number;
}

function toNonNegativeNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new HttpError(400, `${fieldName} must be a non-negative number`);
  }

  return number;
}

async function submitStandaloneMatchResult(payload) {
  const tournamentId = toPositiveNumber(payload.tournament_id, "Tournament ID");
  const teamId = toPositiveNumber(payload.team_id, "Team ID");
  const placement = toPositiveNumber(payload.placement, "Placement");
  const kills = toNonNegativeNumber(payload.kills, "Kills");

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [tournamentRows] = await connection.query(
      "SELECT id FROM tournaments WHERE id = ? LIMIT 1",
      [tournamentId]
    );

    if (!tournamentRows.length) {
      throw new HttpError(404, "Tournament not found");
    }

    const [teamRows] = await connection.query(
      "SELECT id FROM teams WHERE id = ? LIMIT 1",
      [teamId]
    );

    if (!teamRows.length) {
      throw new HttpError(404, "Team not found");
    }

    const placementPointsMap = await getPlacementPointsMap(connection);
    const totalPoints = calculateMatchPoints({ placement, kills }, placementPointsMap);

    await connection.query(
      `
        INSERT INTO match_results (tournament_id, team_id, placement, kills, points)
        VALUES (?, ?, ?, ?, ?)
      `,
      [tournamentId, teamId, placement, kills, totalPoints]
    );

    await connection.query(
      `
        UPDATE teams
        SET
          total_points = COALESCE(total_points, 0) + ?,
          total_kills = COALESCE(total_kills, 0) + ?,
          matches_played = COALESCE(matches_played, 0) + 1
        WHERE id = ?
      `,
      [totalPoints, kills, teamId]
    );

    await connection.commit();

    return {
      tournament_id: tournamentId,
      team_id: teamId,
      total_points: totalPoints
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

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
