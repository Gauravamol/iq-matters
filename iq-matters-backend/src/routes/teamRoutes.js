const express = require("express");
const { authenticate } = require("../middleware/auth");
const { asyncHandler, HttpError } = require("../utils/http");
const { createTeam, getTeamByUserId, getPlayersByTeamId } = require("../services/teamService");

const router = express.Router();

router.post("/create-team", authenticate, asyncHandler(async (req, res) => {
  const result = await createTeam(req.body, req.user);

  res.status(201).json({
    message: "Team created successfully",
    ...result
  });
}));

router.get("/team/:user_id", authenticate, asyncHandler(async (req, res) => {
  const userId = Number(req.params.user_id);

  if (req.user.role !== "admin" && userId !== Number(req.user.id)) {
    throw new HttpError(403, "You can only view your own team dashboard");
  }

  const team = await getTeamByUserId(userId);
  res.json(team);
}));

router.get("/players/:team_id", asyncHandler(async (req, res) => {
  const players = await getPlayersByTeamId(Number(req.params.team_id));
  res.json(players);
}));

module.exports = router;
