const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who triggered it (null for system notifications)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: [
        // Chat
        "new_message",
        "message_reaction",
        "message_mention",

        // Meeting
        "meeting_invite",
        "meeting_started",
        "meeting_ended",
        "meeting_reminder",

        // Task / Project
        "task_assigned",
        "task_due_soon",
        "task_completed",
        "task_commented",

        // Team
        "team_invite",
        "team_role_changed",

        // AI
        "ai_summary_ready",
        "ai_action_items_ready",

        // System
        "system",
      ],
      required: true,
    },

    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, maxlength: 1000 },

    // Deep-link data so the frontend knows where to navigate
    data: {
      entityType: {
        type: String,
        enum: ["message", "meeting", "task", "team", "user", null],
        default: null,
      },
      entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
      extra: { type: mongoose.Schema.Types.Mixed, default: {} },
    },

    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    // Push notification tracking
    isPushed: { type: Boolean, default: false },
    pushedAt: { type: Date, default: null },

    // Optional expiry (reminders etc.)
    expiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

// Mark multiple as read
notificationSchema.statics.markAllRead = function (recipientId) {
  return this.updateMany(
    { recipient: recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Unread count
notificationSchema.statics.unreadCount = function (recipientId) {
  return this.countDocuments({ recipient: recipientId, isRead: false });
};

module.exports = mongoose.model("Notification", notificationSchema);