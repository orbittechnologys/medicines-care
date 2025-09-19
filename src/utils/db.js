import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set");

  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 50, // increase pool size for burst handling
      minPoolSize: 10, // keep warm connections
      serverSelectionTimeoutMS: 10000, // fail fast if cluster unreachable
      socketTimeoutMS: 60000, // keep sockets alive longer
      connectTimeoutMS: 10000, // avoid hanging on startup
      keepAlive: true, // keep TCP connections open
      keepAliveInitialDelay: 300000, // 5 min before keepalive packets
      family: 4, // force IPv4 (Atlas prefers it)
    });

    console.log("✅ MongoDB connected (B-series optimized)");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}
