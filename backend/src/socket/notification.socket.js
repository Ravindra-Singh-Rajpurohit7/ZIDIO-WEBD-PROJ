const Notification = require("../models/Notification");

/**
 * Registers notification-related socket events.
 * Also handles online presence tracking.
 *
 * @param {import("socket.io").Socket} socket
 * @param {import("socket.io").Server} io
 * @param {Map<string, Set<string>>} onlineUsers  - userId → Set of socketIds
 */
module.exports = function registerNotificationSocket(socket, io, onlineUsers) {
  const userId = socket.user._id.toString();

  // ─── Presence: mark online ─────────────────────────────────────────────
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Broadcast to all rooms the user is in
  socket.broadcast.emit("presence:online", { userId, name: socket.user.name });

  // ─── Fetch unread count on connect ────────────────────────────────────
  Notification.unreadCount(userId)
    .then((count) => socket.emit("notification:unread_count", { count }))
    .catch(() => {});

  // ─── Mark single notification read ────────────────────────────────────
  socket.on("notification:read", async ({ notificationId }) => {
    try {
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { $set: { isRead: true, readAt: new Date() } }
      );
      const count = await Notification.unreadCount(userId);
      socket.emit("notification:unread_count", { count });
    } catch (err) {
      console.error("notification:read error:", err);
    }
  });

  // ─── Mark all read ─────────────────────────────────────────────────────
  socket.on("notification:read_all", async () => {
    try {
      await Notification.markAllRead(userId);
      socket.emit("notification:unread_count", { count: 0 });
    } catch (err) {
      console.error("notification:read_all error:", err);
    }
  });

  // ─── Disconnect: presence ─────────────────────────────────────────────
  socket.on("disconnect", () => {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        // Broadcast offline after a short grace period
        // (handles page refresh without flashing offline status)
        setTimeout(() => {
          if (!onlineUsers.has(userId)) {
            io.emit("presence:offline", { userId });
          }
        }, 3000);
      }
    }
  });

  // ─── Get who's online (called on join) ────────────────────────────────
  socket.on("presence:who_is_online", () => {
    const onlineIds = Array.from(onlineUsers.keys());
    socket.emit("presence:online_list", { userIds: onlineIds });
  });
};