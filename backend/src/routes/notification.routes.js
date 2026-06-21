const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const notifController = require("../controllers/notification.controller");

router.use(protect);

router.get("/", notifController.getNotifications);
router.get("/unread-count", notifController.getUnreadCount);
router.patch("/read-all", notifController.markAllRead);
router.delete("/clear-all", notifController.clearAll);
router.patch("/:id/read", notifController.markRead);
router.delete("/:id", notifController.deleteNotification);

module.exports = router;