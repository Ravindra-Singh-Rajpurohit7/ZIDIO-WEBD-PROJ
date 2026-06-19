import Message from '../models/Message.js';
import Meeting from '../models/Meeting.js';

// Track active users inside room sessions
// Format: { [meetingId]: [ { socketId, userId, userName }, ... ] }
const roomUsers = {};

export default (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a meeting room session
    socket.on('join-room', async ({ meetingId, userId, userName }) => {
      socket.join(meetingId);
      socket.meetingId = meetingId;
      socket.userId = userId;
      socket.userName = userName;

      if (!roomUsers[meetingId]) {
        roomUsers[meetingId] = [];
      }

      // Check if user already exists to avoid redundant peer connection offers
      const existsIndex = roomUsers[meetingId].findIndex((u) => u.userId === userId);
      if (existsIndex !== -1) {
        roomUsers[meetingId][existsIndex].socketId = socket.id;
      } else {
        roomUsers[meetingId].push({ socketId: socket.id, userId, userName });
      }

      console.log(`User ${userName} (${userId}) joined room: ${meetingId}`);

      // List of other users already in this room
      const otherUsers = roomUsers[meetingId].filter((u) => u.socketId !== socket.id);

      // Tell existing participants that a new peer connected
      socket.to(meetingId).emit('user-connected', {
        socketId: socket.id,
        userId,
        userName,
      });

      // Send the newly joined user the list of current participants to connect WebRTC peers
      socket.emit('get-all-users', otherUsers);
    });

    // WebRTC signaling relay events
    socket.on('offer', ({ target, offer }) => {
      io.to(target).emit('offer', {
        sender: socket.id,
        offer,
      });
    });

    socket.on('answer', ({ target, answer }) => {
      io.to(target).emit('answer', {
        sender: socket.id,
        answer,
      });
    });

    socket.on('ice-candidate', ({ target, candidate }) => {
      io.to(target).emit('ice-candidate', {
        sender: socket.id,
        candidate,
      });
    });

    // Real-Time Room Messaging
    socket.on('send-message', async ({ meetingId, senderId, text }) => {
      try {
        const meeting = await Meeting.findOne({ meetingId });
        if (!meeting) return;

        // Save conversation history to MongoDB
        const newMessage = await Message.create({
          meeting: meeting._id,
          sender: senderId,
          text,
        });

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'name email avatar');

        // Broadcast messaging payload to everyone in meeting room
        io.to(meetingId).emit('receive-message', populatedMessage);
      } catch (err) {
        console.error('Socket chat message save error:', err.message);
      }
    });

    // Real-Time Chat Typing indicators
    socket.on('typing', ({ meetingId, userName }) => {
      socket.to(meetingId).emit('user-typing', { userName });
    });

    socket.on('stop-typing', ({ meetingId, userName }) => {
      socket.to(meetingId).emit('user-stop-typing', { userName });
    });

    // Team Workspace Notes Synchronizer
    socket.on('join-team', ({ teamId }) => {
      socket.join(teamId);
      console.log(`Socket joined team channel: ${teamId}`);
    });

    socket.on('edit-notes', ({ teamId, notes }) => {
      // Broadcast current editor changes to other team collaborators
      socket.to(teamId).emit('notes-updated', notes);
    });

    // Disconnect and Cleanup
    socket.on('leave-room', () => {
      handleDisconnect(socket, io);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket, io);
    });
  });
};

const handleDisconnect = (socket, io) => {
  const { meetingId, userName } = socket;
  if (meetingId && roomUsers[meetingId]) {
    // Remove current socket session
    roomUsers[meetingId] = roomUsers[meetingId].filter((u) => u.socketId !== socket.id);
    if (roomUsers[meetingId].length === 0) {
      delete roomUsers[meetingId];
    }

    console.log(`User ${userName} disconnected from room: ${meetingId}`);

    // Notify peers that connection has closed
    socket.to(meetingId).emit('user-disconnected', {
      socketId: socket.id,
      userName,
    });
  }
};
