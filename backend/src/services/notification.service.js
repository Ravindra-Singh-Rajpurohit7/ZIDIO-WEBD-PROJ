const Notification = require("../models/Notification");

/**
 * Central function to create a notification and emit it via Socket.io
 * Can be called from any controller/socket handler.
 *
 * @param {Object} options
 * @param {string|ObjectId} options.recipient
 * @param {string|ObjectId} [options.sender]
 * @param {string} options.type
 * @param {string} options.title
 * @param {string} [options.body]
 * @param {Object} [options.data]
 * @param {Date}   [options.expiresAt]
 * @param {Object} [options.io]  - socket.io server instance (optional for real-time push)
 */
exports.createNotification = async (options) => {
  const { recipient, sender = null, type, title, body = "", data = {}, expiresAt = null, io } = options;

  const notification = await Notification.create({
    recipient,
    sender,
    type,
    title,
    body,
    data,
    expiresAt,
  });

  await notification.populate("sender", "name avatar");

  // Push via Socket.io if io instance is available
  if (io) {
    io.to(`user:${recipient.toString()}`).emit("notification:new", notification);
  } else {
    // Lazy-load from global if not passed
    try {
      const { getIO } = require("../socket/socket.init");
      const ioInstance = getIO();
      if (ioInstance) {
        ioInstance.to(`user:${recipient.toString()}`).emit("notification:new", notification);
      }
    } catch (_) {
      // Socket not set up yet — silent fail (still saved in DB)
    }
  }

  return notification;
};

/**
 * Bulk create notifications for multiple recipients (e.g., team announcements)
 */
exports.createBulkNotifications = async (recipients, baseOptions) => {
  const { io, ...rest } = baseOptions;

  const docs = recipients.map((r) => ({
    ...rest,
    recipient: r,
  }));

  const created = await Notification.insertMany(docs);

  // Emit to each connected user
  try {
    const { getIO } = require("../socket/socket.init");
    const ioInstance = io || getIO();
    if (ioInstance) {
      recipients.forEach((r, i) => {
        ioInstance.to(`user:${r.toString()}`).emit("notification:new", created[i]);
      });
    }
  } catch (_) {}

  return created;
};