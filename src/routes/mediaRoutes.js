const express = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");
const {
  getMediaForPage,
  createMediaAsset,
  deleteMediaAsset
} = require("../services/mediaService");

const router = express.Router();

router.get("/media/:page", asyncHandler(async (req, res) => {
  const media = await getMediaForPage(req.params.page);
  res.json(media);
}));

router.post("/admin/media", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const asset = await createMediaAsset(req.body);

  res.status(201).json({
    message: "Media asset created",
    asset
  });
}));

router.delete("/admin/media/:id", authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const asset = await deleteMediaAsset(req.params.id);

  res.json({
    message: "Media asset deleted",
    asset
  });
}));

module.exports = router;
