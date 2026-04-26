const express = require("express");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/http");
const { getUploadedFile, saveUploadedFile, toAbsoluteUploadUrl } = require("../services/uploadService");

const router = express.Router();

function toHeaderSafeFileName(value) {
  return String(value || "download").replace(/[\r\n"]/g, "").slice(0, 160) || "download";
}

router.get("/uploads/files/:id/:fileName", asyncHandler(async (req, res) => {
  const uploadedFile = await getUploadedFile(req.params.id);
  const fileName = toHeaderSafeFileName(uploadedFile.original_name || uploadedFile.stored_name);

  res.set({
    "Content-Type": uploadedFile.mime_type || "application/octet-stream",
    "Content-Length": uploadedFile.size,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": `inline; filename="${fileName}"`
  });

  res.send(uploadedFile.content);
}));

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
