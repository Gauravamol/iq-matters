const express = require("express");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");
const { registerUser, loginUser, getCurrentSession } = require("../services/authService");

const router = express.Router();

router.post("/register", asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);

  res.status(201).json({
    message: "User registered",
    user
  });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const session = await loginUser(req.body);
  res.json(session);
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const session = await getCurrentSession(req.user.id);
  res.json(session);
}));

module.exports = router;
