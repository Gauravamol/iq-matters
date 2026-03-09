const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");
const {
  getDashboardStats,
  getUsers,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser
} = require("../services/adminService");
const {
  listTournaments,
  createTournament,
  getTournamentRegistrations,
  updateTournament,
  deleteTournament
} = require("../services/tournamentService");
const {
  createTeam,
  updateTeam,
  deleteTeam,
  getAdminTeams
} = require("../services/teamService");
const {
  createMatch,
  getAdminMatches,
  updateMatch,
  deleteMatch,
  getMatchAssignments,
  assignMatchTeams,
  listAdminResults,
  submitResult,
  updateResult,
  deleteResult
} = require("../services/matchService");
const {
  getPointsSystem,
  updatePointsSystem,
  getLeaderboardSettings,
  updateLeaderboardSettings,
  getPlatformFeatures
} = require("../services/settingsService");

const router = express.Router();

router.use("/admin", authenticate, requireAdmin);

router.get("/admin/dashboard", asyncHandler(async (req, res) => {
  const stats = await getDashboardStats();
  res.json(stats);
}));

router.get("/admin/dashboard-stats", asyncHandler(async (req, res) => {
  const stats = await getDashboardStats();
  res.json(stats);
}));

router.get("/admin/settings", asyncHandler(async (req, res) => {
  const [leaderboardSettings, pointsSystem, features] = await Promise.all([
    getLeaderboardSettings(),
    getPointsSystem(),
    getPlatformFeatures()
  ]);

  res.json({
    leaderboardSettings,
    pointsSystem,
    features
  });
}));

router.put("/admin/settings", asyncHandler(async (req, res) => {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(req.body, "leaderboardSettings")) {
    updates.leaderboardSettings = await updateLeaderboardSettings(req.body.leaderboardSettings || {});
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "pointsSystem")) {
    updates.pointsSystem = await updatePointsSystem(req.body.pointsSystem || []);
  }

  res.json({
    message: "Admin settings updated",
    ...updates
  });
}));

router.get("/admin/tournaments", asyncHandler(async (req, res) => {
  const tournaments = await listTournaments(null);
  res.json(tournaments);
}));

router.post("/admin/tournaments", asyncHandler(async (req, res) => {
  const tournament = await createTournament(req.body);

  res.status(201).json({
    message: "Tournament created",
    tournament
  });
}));

router.get("/admin/tournaments/:id/registrations", asyncHandler(async (req, res) => {
  const registrations = await getTournamentRegistrations(Number(req.params.id));
  res.json(registrations);
}));

router.put("/admin/tournaments/:id", asyncHandler(async (req, res) => {
  const tournament = await updateTournament(Number(req.params.id), req.body);

  res.json({
    message: "Tournament updated",
    tournament
  });
}));

router.delete("/admin/tournaments/:id", asyncHandler(async (req, res) => {
  const tournament = await deleteTournament(Number(req.params.id));

  res.json({
    message: "Tournament deleted",
    tournament
  });
}));

router.get("/admin/teams", asyncHandler(async (req, res) => {
  const teams = await getAdminTeams();
  res.json(teams);
}));

router.post("/admin/teams", asyncHandler(async (req, res) => {
  const result = await createTeam(req.body, req.user);

  res.status(201).json({
    message: "Team created successfully",
    ...result
  });
}));

router.put("/admin/teams/:id", asyncHandler(async (req, res) => {
  const result = await updateTeam(Number(req.params.id), req.body);

  res.json({
    message: "Team updated",
    ...result
  });
}));

router.delete("/admin/teams/:id", asyncHandler(async (req, res) => {
  const team = await deleteTeam(Number(req.params.id));

  res.json({
    message: "Team deleted",
    team
  });
}));

router.get("/admin/matches", asyncHandler(async (req, res) => {
  const matches = await getAdminMatches();
  res.json(matches);
}));

router.post("/admin/matches", asyncHandler(async (req, res) => {
  const match = await createMatch(req.body);

  res.status(201).json({
    message: "Match created",
    match
  });
}));

router.put("/admin/matches/:id", asyncHandler(async (req, res) => {
  const match = await updateMatch(Number(req.params.id), req.body);

  res.json({
    message: "Match updated",
    match
  });
}));

router.delete("/admin/matches/:id", asyncHandler(async (req, res) => {
  const match = await deleteMatch(Number(req.params.id));

  res.json({
    message: "Match deleted",
    match
  });
}));

router.get("/admin/matches/:id/assignments", asyncHandler(async (req, res) => {
  const assignments = await getMatchAssignments(Number(req.params.id));
  res.json(assignments);
}));

router.post("/admin/matches/:id/assignments", asyncHandler(async (req, res) => {
  const assignment = await assignMatchTeams(Number(req.params.id), req.body.team_ids || []);

  res.json({
    message: "Match assignments updated",
    ...assignment
  });
}));

router.get("/admin/results", asyncHandler(async (req, res) => {
  const results = await listAdminResults();
  res.json(results);
}));

router.post("/admin/results", asyncHandler(async (req, res) => {
  const result = await submitResult(req.body);

  res.status(201).json({
    message: "Result submitted",
    ...result
  });
}));

router.put("/admin/results/:id", asyncHandler(async (req, res) => {
  const result = await updateResult(Number(req.params.id), req.body);

  res.json({
    message: "Result updated",
    result
  });
}));

router.delete("/admin/results/:id", asyncHandler(async (req, res) => {
  const result = await deleteResult(Number(req.params.id));

  res.json({
    message: "Result deleted",
    result
  });
}));

router.get("/admin/users", asyncHandler(async (req, res) => {
  const users = await getUsers();
  res.json(users);
}));

router.post("/admin/users", asyncHandler(async (req, res) => {
  const user = await createUser(req.body);

  res.status(201).json({
    message: "User created",
    user
  });
}));

router.put("/admin/users/:id", asyncHandler(async (req, res) => {
  const user = await updateUser(Number(req.params.id), req.body);

  res.json({
    message: "User updated",
    user
  });
}));

router.patch("/admin/users/:id/role", asyncHandler(async (req, res) => {
  const user = await updateUserRole(Number(req.params.id), req.body.role);

  res.json({
    message: "User role updated",
    user
  });
}));

router.delete("/admin/users/:id", asyncHandler(async (req, res) => {
  const user = await deleteUser(Number(req.params.id));

  res.json({
    message: "User deleted",
    user
  });
}));

module.exports = router;
