const Notification = require("../models/Notification");
const { createNotification } = require("../services/notification.service");

/**
 * GET /api/notifications?page=1&limit=20&unreadOnly=false
 */
exports.getNotifications = async (req, res) => {
  try {
    const me = req.user._id;
    const { page = 1, limit = 20, unreadOnly = "false" } = req.query;

    const filter = { recipient: me };
    if (unreadOnly === "true") filter.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("sender", "name avatar"),
      Notification.unreadCount(me),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      page: Number(page),
    });
  } catch (err) {
    console.error("getNotifications:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: me },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: notification });
  } catch (err) {
    console.error("markRead:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PATCH /api/notifications/read-all
 */
exports.markAllRead = async (req, res) => {
  try {
    const me = req.user._id;
    await Notification.markAllRead(me);
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("markAllRead:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user._id;

    await Notification.findOneAndDelete({ _id: id, recipient: me });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("deleteNotification:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/notifications/clear-all
 */
exports.clearAll = async (req, res) => {
  try {
    const me = req.user._id;
    await Notification.deleteMany({ recipient: me });
    res.json({ success: true, message: "All notifications cleared" });
  } catch (err) {
    console.error("clearAll:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/notifications/unread-count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.unreadCount(req.user._id);
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    console.error("getUnreadCount:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};