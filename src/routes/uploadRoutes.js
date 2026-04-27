const express = require("express");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");
const { saveUploadedFile, toAbsoluteUploadUrl } = require("../services/uploadService");

const router = express.Router();

router.post("/uploads", authenticate, asyncHandler(async (req, res) => {
  const uploadedFile = await saveUploadedFile(req.body || {});

  res.status(201).json({
    message: "File uploaded",
    file: {
      ...uploadedFile,
      url: toAbsoluteUploadUrl(req, uploadedFile.relative_url)
    }
  });
}));

module.exports = router;
