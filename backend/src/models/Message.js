const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Who sent it
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Direct message or group/meeting chat
    chatType: {
      type: String,
      enum: ["direct", "meeting", "team"],
      required: true,
    },

    // For direct messages: the recipient user
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // For meeting chat: the meeting ID
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      default: null,
    },

    // For team chat: the team ID
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    content: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    // File/image attachments
    attachments: [
      {
        url: String,
        publicId: String, // Cloudinary public_id
        fileType: {
          type: String,
          enum: ["image", "video", "audio", "document", "other"],
        },
        fileName: String,
        fileSize: Number, // bytes
      },
    ],

    // Message type
    messageType: {
      type: String,
      enum: ["text", "file", "system", "ai_summary"],
      default: "text",
    },

    // Read receipts — array of { user, readAt }
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],

    // Reply threading
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Reactions: { "👍": [userId, ...], "❤️": [...] }
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: {},
    },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    // Edit history
    isEdited: { type: Boolean, default: false },
    editHistory: [
      {
        content: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ meeting: 1, createdAt: 1 });
messageSchema.index({ team: 1, createdAt: -1 });
messageSchema.index({ chatType: 1 });

// Helper: build conversation query between two users
messageSchema.statics.getDirectConversation = function (
  userId1,
  userId2,
  page = 1,
  limit = 50
) {
  return this.find({
    chatType: "direct",
    isDeleted: false,
    $or: [
      { sender: userId1, recipient: userId2 },
      { sender: userId2, recipient: userId1 },
    ],
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("sender", "name avatar")
    .populate("recipient", "name avatar")
    .populate("replyTo", "content sender");
};

module.exports = mongoose.model("Message", messageSchema);