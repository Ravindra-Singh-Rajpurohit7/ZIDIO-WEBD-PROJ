import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI, {
      // These options prevent deprecation warnings
      // and configure connection pool
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
    // Exit process with failure code
    // Server cannot run without database
    process.exit(1);
  }
};

export { connectDB };