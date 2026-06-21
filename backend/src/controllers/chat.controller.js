const Message = require("../models/Message");
const Notification = require("../models/Notification");
const { uploadToCloudinary, deleteFromCloudinary } = require("../services/storage.service");
const { createNotification } = require("../services/notification.service");

// ─── Direct Chat ────────────────────────────────────────────────────────────

/**
 * GET /api/chat/direct/:userId?page=1&limit=50
 * Fetch conversation between logged-in user and :userId
 */
exports.getDirectMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const me = req.user._id;

    const messages = await Message.getDirectConversation(
      me,
      userId,
      Number(page),
      Number(limit)
    );

    // Mark incoming messages as read
    await Message.updateMany(
      {
        chatType: "direct",
        sender: userId,
        recipient: me,
        "readBy.user": { $ne: me },
      },
      { $addToSet: { readBy: { user: me, readAt: new Date() } } }
    );

    res.json({
      success: true,
      data: messages.reverse(), // chronological order
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("getDirectMessages:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/chat/direct/conversations
 * List all unique direct-chat partners for the logged-in user
 */
exports.getConversationList = async (req, res) => {
  try {
    const me = req.user._id;

    const conversations = await Message.aggregate([
      {
        $match: {
          chatType: "direct",
          isDeleted: false,
          $or: [{ sender: me }, { recipient: me }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        // The "other" person in the convo
        $addFields: {
          otherUser: {
            $cond: [{ $eq: ["$sender", me] }, "$recipient", "$sender"],
          },
        },
      },
      {
        $group: {
          _id: "$otherUser",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$sender", me] },
                    {
                      $not: {
                        $in: [me, { $ifNull: ["$readBy.user", []] }],
                      },
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          "user._id": 1,
          "user.name": 1,
          "user.avatar": 1,
          "user.isOnline": 1,
          "lastMessage.content": 1,
          "lastMessage.messageType": 1,
          "lastMessage.createdAt": 1,
          unreadCount: 1,
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    res.json({ success: true, data: conversations });
  } catch (err) {
    console.error("getConversationList:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Meeting Chat ────────────────────────────────────────────────────────────

/**
 * GET /api/chat/meeting/:meetingId?page=1&limit=100
 */
exports.getMeetingMessages = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { page = 1, limit = 100 } = req.query;

    const messages = await Message.find({
      chatType: "meeting",
      meeting: meetingId,
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("sender", "name avatar")
      .populate("replyTo", "content sender");

    res.json({ success: true, data: messages, page: Number(page) });
  } catch (err) {
    console.error("getMeetingMessages:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Team Chat ───────────────────────────────────────────────────────────────

/**
 * GET /api/chat/team/:teamId?page=1&limit=50
 */
exports.getTeamMessages = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      chatType: "team",
      team: teamId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("sender", "name avatar")
      .populate("replyTo", "content sender");

    res.json({ success: true, data: messages.reverse(), page: Number(page) });
  } catch (err) {
    console.error("getTeamMessages:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Send Message (REST fallback; real-time handled via socket) ───────────────

/**
 * POST /api/chat/send
 * Body: { chatType, content, recipient?, meeting?, team?, replyTo? }
 * Files: multipart if attachments present
 */
exports.sendMessage = async (req, res) => {
  try {
    const { chatType, content, recipient, meeting, team, replyTo } = req.body;
    const sender = req.user._id;

    if (!chatType) {
      return res.status(400).json({ success: false, message: "chatType required" });
    }

    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    // Handle attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
      const uploads = await Promise.all(
        req.files.map((f) => uploadToCloudinary(f, "chat_attachments"))
      );
      attachments = uploads.map((u, i) => ({
        url: u.secure_url,
        publicId: u.public_id,
        fileType: req.files[i].mimetype.startsWith("image") ? "image" : "document",
        fileName: req.files[i].originalname,
        fileSize: req.files[i].size,
      }));
    }

    const message = await Message.create({
      sender,
      chatType,
      content: content?.trim(),
      recipient: recipient || null,
      meeting: meeting || null,
      team: team || null,
      replyTo: replyTo || null,
      attachments,
      messageType: attachments.length ? "file" : "text",
    });

    await message.populate("sender", "name avatar");
    if (replyTo) await message.populate("replyTo", "content sender");

    // Notify recipient (direct msg)
    if (chatType === "direct" && recipient) {
      await createNotification({
        recipient,
        sender,
        type: "new_message",
        title: `New message from ${req.user.name}`,
        body: content?.slice(0, 100) || "Sent an attachment",
        data: { entityType: "message", entityId: message._id },
      });
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    console.error("sendMessage:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Edit / Delete / React ────────────────────────────────────────────────────

/**
 * PATCH /api/chat/message/:messageId
 */
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const me = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Not found" });
    if (!message.sender.equals(me))
      return res.status(403).json({ success: false, message: "Not your message" });

    message.editHistory.push({ content: message.content, editedAt: new Date() });
    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    res.json({ success: true, data: message });
  } catch (err) {
    console.error("editMessage:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/chat/message/:messageId
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const me = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Not found" });
    if (!message.sender.equals(me))
      return res.status(403).json({ success: false, message: "Not your message" });

    // Delete attachments from Cloudinary
    if (message.attachments.length) {
      await Promise.all(
        message.attachments.map((a) => deleteFromCloudinary(a.publicId))
      );
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = "This message was deleted.";
    await message.save();

    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    console.error("deleteMessage:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/chat/message/:messageId/react
 * Body: { emoji }
 */
exports.reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const me = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Not found" });

    const users = message.reactions.get(emoji) || [];
    const alreadyReacted = users.some((id) => id.equals(me));

    if (alreadyReacted) {
      message.reactions.set(
        emoji,
        users.filter((id) => !id.equals(me))
      );
    } else {
      message.reactions.set(emoji, [...users, me]);
    }

    await message.save();
    res.json({ success: true, data: message.reactions });
  } catch (err) {
    console.error("reactToMessage:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/chat/message/:messageId/read
 */
exports.markMessageRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const me = req.user._id;

    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { readBy: { user: me, readAt: new Date() } },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("markMessageRead:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/chat/search?q=hello&chatType=direct&peer=userId
 */
exports.searchMessages = async (req, res) => {
  try {
    const { q, chatType, peer, meeting, team } = req.query;
    const me = req.user._id;

    if (!q) return res.status(400).json({ success: false, message: "q required" });

    let filter = {
      isDeleted: false,
      content: { $regex: q, $options: "i" },
    };

    if (chatType === "direct") {
      filter.chatType = "direct";
      filter.$or = [
        { sender: me, recipient: peer },
        { sender: peer, recipient: me },
      ];
    } else if (chatType === "meeting") {
      filter.chatType = "meeting";
      filter.meeting = meeting;
    } else if (chatType === "team") {
      filter.chatType = "team";
      filter.team = team;
    }

    const results = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("sender", "name avatar");

    res.json({ success: true, data: results });
  } catch (err) {
    console.error("searchMessages:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};