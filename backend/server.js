// ═══════════════════════════════════════════════════════
// IMPORTANT: dotenv must be configured FIRST
// before any other imports that might need env variables
// ═══════════════════════════════════════════════════════
import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";

const PORT = process.env.PORT || 8000;

// Create HTTP server
// WHY: We create HTTP server separately (not app.listen)
// because Socket.io needs to attach to httpServer, not Express app
const httpServer = createServer(app);

// ─── START SERVER ─────────────────────────────────────
const startServer = async () => {
  try {
    // Step 1: Connect to MongoDB first
    await connectDB();

    // Step 2: Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║         IntellMeet Backend Server             ║
╠═══════════════════════════════════════════════╣
║  Status    : Running ✅                        ║
║  Port      : ${PORT}                           ║
║  Env       : ${process.env.NODE_ENV}            ║
║  API Base  : http://localhost:${PORT}/api/v1   ║
║  Health    : http://localhost:${PORT}/health   ║
╚═══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();

// ─── GRACEFUL SHUTDOWN ────────────────────────────────
// Handle process termination signals
// This ensures ongoing requests complete before shutdown
process.on("SIGTERM", () => {
  console.log("\n⚠️  SIGTERM received. Shutting down gracefully...");
  httpServer.close(() => {
    console.log("✅ HTTP server closed.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n⚠️  SIGINT received (Ctrl+C). Shutting down...");
  httpServer.close(() => {
    console.log("✅ HTTP server closed.");
    process.exit(0);
  });
});

// ─── UNHANDLED ERRORS ────────────────────────────────
// Catch any unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  // In production, you'd want to restart the server here
  // For now, just log it
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

export { httpServer };