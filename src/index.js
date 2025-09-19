import http from "http";
import https from "https";
import fs from "fs";
import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./utils/db.js";

dotenv.config();

const port = process.env.PORT || 4036;
const deployEnv = process.env.DEPLOY_ENV || "local";

(async () => {
  await connectDB();

  // Local → HTTP server
  if (deployEnv === "local") {
    http.createServer(app).listen(port, () => {
      console.log(`🚀 HTTP server running on port ${port}`);
    });
  }

  // Production → HTTPS server
  else if (deployEnv === "prod") {
    // trust proxy (if using nginx, cloudflare, etc.)
  app.set("trust proxy", true);
    try {
      const options = {
        cert: fs.readFileSync(process.env.SSL_CRT_PATH),
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
      };

      https.createServer(options, app).listen(port, () => {
        console.log(`🔒 HTTPS server running on port ${port}`);
      });
    } catch (err) {
      console.error("❌ Failed to start HTTPS server:", err.message);
    }
  }
})();
