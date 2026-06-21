import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGO_URI, {
      
    });

    console.log(
      `\n✅ MongoDB Connected Successfully!`
    );
    console.log(
      `   Host: ${connectionInstance.connection.host}`
    );
    console.log(
      `   Database: ${connectionInstance.connection.name}\n`
    );

    // ─── CONNECTION EVENT LISTENERS ──────────────────
    mongoose.connection.on("disconnected", () => {
      console.log("⚠️  MongoDB disconnected!");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected!");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });
  } catch (error) {
    console.error("❌ MongoDB Connection FAILED:", error.message);
    
    process.exit(1);
  }
};

export { connectDB };