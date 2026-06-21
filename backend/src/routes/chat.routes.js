const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/auth.middleware");
const chatController = require("../controllers/chat.controller");

// Multer: store in memory, max 10 MB per file, up to 5 files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed"), false);
  },
});

// All routes require authentication
router.use(protect);

// ── Conversation list ──────────────────────────────────────────────────────
router.get("/direct/conversations", chatController.getConversationList);

// ── Direct Messages ────────────────────────────────────────────────────────
router.get("/direct/:userId", chatController.getDirectMessages);

// ── Meeting Chat ───────────────────────────────────────────────────────────
router.get("/meeting/:meetingId", chatController.getMeetingMessages);

// ── Team Chat ──────────────────────────────────────────────────────────────
router.get("/team/:teamId", chatController.getTeamMessages);

// ── Send (REST fallback / file uploads) ───────────────────────────────────
router.post("/send", upload.array("attachments", 5), chatController.sendMessage);

// ── Message actions ────────────────────────────────────────────────────────
router.patch("/message/:messageId", chatController.editMessage);
router.delete("/message/:messageId", chatController.deleteMessage);
router.post("/message/:messageId/react", chatController.reactToMessage);
router.post("/message/:messageId/read", chatController.markMessageRead);

// ── Search ─────────────────────────────────────────────────────────────────
router.get("/search", chatController.searchMessages);

module.exports = router;