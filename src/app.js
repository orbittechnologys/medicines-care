import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import medicinesRoutes from "./routes/medicinesRoutes.js";
import apiKeyMiddleware from "./middleware/apiKey.js";
import errorHandler from "./middleware/error.js";

const app = express();

// security & compression
app.use(helmet());
app.use(compression());

// CORS config
const allowedOrigins =
  process.env.ALLOWED_ORIGINS === "*"
    ? "*"
    : process.env.ALLOWED_ORIGINS?.split(",");

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: false,
  })
);

app.options("*", cors());

// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// logging
app.use(morgan("dev"));

// rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// API key check
app.use("/api/v1", apiKeyMiddleware);

// routes
app.use("/api/v1/medicines", medicinesRoutes);

// health check
app.get("/health", (req, res) => res.json({ msg: "Server is up and running" }));

// error handler
app.use(errorHandler);

export default app;
