import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  mongoose.set("strictQuery", true);
  mongoose.set("toJSON", {
    virtuals: true,
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  });
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
    console.log("✅ MongoDB connected");
  } catch (e) {
    console.error("❌ MongoDB connection failed", e);
    process.exit(1);
  }
}