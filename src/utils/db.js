import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);

  await mongoose.connect(uri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
  });

  console.log("✅ MongoDB connected");
}
