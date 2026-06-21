const Message = require("../models/Message");
const { createNotification } = require("../services/notification.service");
const { uploadToCloudinary } = require("../services/storage.service");

/**
 * Registers chat-related socket events on a connected socket.
 * Called from the main socket setup after authentication.
 *
 * @param {import("socket.io").Socket} socket
 * @param {import("socket.io").Server} io
 */
module.exports = function registerChatSocket(socket, io) {
  const userId = socket.user._id.toString();

  // ─── Join personal room (for targeted pushes) ───────────────────────────
  socket.join(`user:${userId}`);

  // ─── Join a chat room ────────────────────────────────────────────────────
  // Payload: { chatType: "direct"|"meeting"|"team", roomId: <peer/meeting/team id> }
  socket.on("chat:join", ({ chatType, roomId }) => {
    if (!roomId) return;
    const room = `${chatType}:${roomId}`;
    socket.join(room);
    socket.emit("chat:joined", { room });
  });

  socket.on("chat:leave", ({ chatType, roomId }) => {
    socket.leave(`${chatType}:${roomId}`);
  });

  // ─── Send message ────────────────────────────────────────────────────────
  /**
   * Payload: {
   *   chatType, content, recipient?, meeting?, team?,
   *   replyTo?, tempId  (client-side optimistic ID)
   * }
   */
  socket.on("chat:message", async (payload, ack) => {
    try {
      const { chatType, content, recipient, meeting, team, replyTo, tempId } = payload;

      if (!content?.trim() && !payload.attachment) {
        return ack?.({ success: false, error: "Empty message" });
      }

      const message = await Message.create({
        sender: userId,
        chatType,
        content: content?.trim(),
        recipient: recipient || null,
        meeting: meeting || null,
        team: team || null,
        replyTo: replyTo || null,
        messageType: "text",
      });

      await message.populate("sender", "name avatar");
      if (replyTo) await message.populate("replyTo", "content sender");

      // Determine room to broadcast to
      let room;
      if (chatType === "direct") {
        room = `direct:${[userId, recipient].sort().join("_")}`;
      } else if (chatType === "meeting") {
        room = `meeting:${meeting}`;
      } else if (chatType === "team") {
        room = `team:${team}`;
      }

      // Broadcast to room (including sender for multi-device)
      io.to(room).emit("chat:message", { ...message.toObject(), tempId });

      // Send notification for direct message
      if (chatType === "direct" && recipient) {
        await createNotification({
          recipient,
          sender: userId,
          type: "new_message",
          title: `New message from ${socket.user.name}`,
          body: content?.slice(0, 100) || "Sent a message",
          data: {
            entityType: "message",
            entityId: message._id,
            extra: { senderId: userId },
          },
          io,
        });
      }

      // Notify @mentions in team/meeting chats
      const mentionRegex = /@\[(.+?)\]\((\w+)\)/g; // @[Name](userId)
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        const mentionedUserId = match[2];
        if (mentionedUserId !== userId) {
          await createNotification({
            recipient: mentionedUserId,
            sender: userId,
            type: "message_mention",
            title: `${socket.user.name} mentioned you`,
            body: content.slice(0, 100),
            data: { entityType: "message", entityId: message._id },
            io,
          });
        }
      }

      ack?.({ success: true, data: message });
    } catch (err) {
      console.error("chat:message error:", err);
      ack?.({ success: false, error: "Failed to send message" });
    }
  });

  // ─── Typing indicators ───────────────────────────────────────────────────
  // Payload: { chatType, roomId }
  socket.on("chat:typing_start", ({ chatType, roomId }) => {
    const room = getRoomKey(chatType, roomId, userId);
    socket.to(room).emit("chat:typing", {
      userId,
      name: socket.user.name,
      chatType,
      roomId,
      isTyping: true,
    });
  });

  socket.on("chat:typing_stop", ({ chatType, roomId }) => {
    const room = getRoomKey(chatType, roomId, userId);
    socket.to(room).emit("chat:typing", {
      userId,
      name: socket.user.name,
      chatType,
      roomId,
      isTyping: false,
    });
  });

  // ─── Read receipt ────────────────────────────────────────────────────────
  // Payload: { messageId, chatType, roomId }
  socket.on("chat:read", async ({ messageId, chatType, roomId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { readBy: { user: userId, readAt: new Date() } },
      });

      const room = getRoomKey(chatType, roomId, userId);
      socket.to(room).emit("chat:read_receipt", {
        messageId,
        userId,
        readAt: new Date(),
      });
    } catch (err) {
      console.error("chat:read error:", err);
    }
  });

  // ─── Edit message ────────────────────────────────────────────────────────
  socket.on("chat:edit", async ({ messageId, content, chatType, roomId }, ack) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return ack?.({ success: false, error: "Not found" });
      if (!message.sender.equals(userId))
        return ack?.({ success: false, error: "Forbidden" });

      message.editHistory.push({ content: message.content, editedAt: new Date() });
      message.content = content.trim();
      message.isEdited = true;
      await message.save();

      const room = getRoomKey(chatType, roomId, userId);
      io.to(room).emit("chat:message_edited", {
        messageId,
        content: message.content,
        isEdited: true,
        editedAt: new Date(),
      });

      ack?.({ success: true });
    } catch (err) {
      console.error("chat:edit error:", err);
      ack?.({ success: false, error: "Failed to edit" });
    }
  });

  // ─── Delete message ──────────────────────────────────────────────────────
  socket.on("chat:delete", async ({ messageId, chatType, roomId }, ack) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return ack?.({ success: false, error: "Not found" });
      if (!message.sender.equals(userId))
        return ack?.({ success: false, error: "Forbidden" });

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = "This message was deleted.";
      await message.save();

      const room = getRoomKey(chatType, roomId, userId);
      io.to(room).emit("chat:message_deleted", { messageId });

      ack?.({ success: true });
    } catch (err) {
      console.error("chat:delete error:", err);
      ack?.({ success: false, error: "Failed to delete" });
    }
  });

  // ─── React to message ────────────────────────────────────────────────────
  socket.on("chat:react", async ({ messageId, emoji, chatType, roomId }, ack) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return ack?.({ success: false, error: "Not found" });

      const users = message.reactions.get(emoji) || [];
      const alreadyReacted = users.some((id) => id.toString() === userId);

      if (alreadyReacted) {
        message.reactions.set(emoji, users.filter((id) => id.toString() !== userId));
      } else {
        message.reactions.set(emoji, [...users, userId]);

        // Notify message author
        if (!message.sender.equals(userId)) {
          await createNotification({
            recipient: message.sender,
            sender: userId,
            type: "message_reaction",
            title: `${socket.user.name} reacted ${emoji}`,
            body: message.content?.slice(0, 80) || "",
            data: { entityType: "message", entityId: message._id },
            io,
          });
        }
      }

      await message.save();

      const room = getRoomKey(chatType, roomId, userId);
      io.to(room).emit("chat:reaction_updated", {
        messageId,
        reactions: Object.fromEntries(message.reactions),
      });

      ack?.({ success: true });
    } catch (err) {
      console.error("chat:react error:", err);
      ack?.({ success: false, error: "Failed to react" });
    }
  });
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function getRoomKey(chatType, roomId, userId) {
  if (chatType === "direct") {
    return `direct:${[userId, roomId].sort().join("_")}`;
  }
  return `${chatType}:${roomId}`;
}