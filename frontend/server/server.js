import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import socketHandler from './socket/socketHandler.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Load environmental configuration variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Setup Socket.io Server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Configure real-time communications
socketHandler(io);

// Global Middleware
app.use(cors());
app.use(express.json());

// Base Health Check Route
app.get('/', (req, res) => {
  res.send('IntellMeet API is active and running.');
});

// Route Integrations
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/ai', aiRoutes);

// Page Not Found & Global Error Interceptors
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server listening in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
