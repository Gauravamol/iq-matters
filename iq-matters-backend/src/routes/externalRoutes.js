const express = require("express");
const { asyncHandler } = require("../utils/http");
const { getExternalEsportsOverview } = require("../services/externalEsportsService");

const router = express.Router();

router.get("/external/esports/overview", asyncHandler(async (req, res) => {
  const overview = await getExternalEsportsOverview();
  res.json(overview);
}));

module.exports = router;
