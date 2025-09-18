import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import https from "https";
import { connectDB } from "./utils/db.js";
import appRoutes from "./routes/medicines.js";
import router from "./routes/medicines.js";

// Load environment variables
dotenv.config();

const port = process.env.PORT || 4036;
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy settings (useful if behind Nginx/Load balancer)
app.set("trust proxy", true);

// Database Connection
connectDB();

// CORS Configuration
const allowedOrigins =
  process.env.ALLOWED_ORIGINS === "*"
    ? "*"
    : process.env.ALLOWED_ORIGINS?.split(",");

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

// Health Check Endpoint
app.get("/health", (req, res) => {
  return res.status(200).json({
    msg: "✅ Indian Medicines API is up and running",
  });
});

// API Routes
app.use("/api", appRoutes);
app.use("/api/v1/medicines", router);

// Server Initialization
if (process.env.DEPLOY_ENV === "local") {
  app.listen(port, () => {
    console.log(`✅ Server listening on http://localhost:${port}`);
  });
} else if (process.env.DEPLOY_ENV === "prod") {
  try {
    const options = {
      cert: fs.readFileSync(process.env.SSL_CRT_PATH),
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
    };
    const httpsServer = https.createServer(options, app);
    httpsServer.listen(port, () => {
      console.log(`✅ HTTPS Server running on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start HTTPS server:", error.message);
  }
}
