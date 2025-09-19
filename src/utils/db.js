import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set");

  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 50,              // burst handling
      minPoolSize: 10,              // keep warm connections
      serverSelectionTimeoutMS: 10000, // fail fast if cluster unreachable
      socketTimeoutMS: 60000,       // keep sockets alive longer
      connectTimeoutMS: 10000,      // avoid hanging on startup
      family: 4,                    // force IPv4 (Atlas prefers it)

      // ✅ correct way in Mongoose v6+
      heartbeatFrequencyMS: 10000,  // send heartbeats to keep connection alive
      retryWrites: true,            // retry on transient errors
    });

    console.log("✅ MongoDB connected (B-series optimized)");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}
