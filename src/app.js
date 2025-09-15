import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoSanitize from "mongo-sanitize";
import { errorHandler, notFound } from "./middleware/error.js";
import medicinesRouter from "./routes/medicines.js";

const app = express();

app.use(helmet());

const allowed = (process.env.CORS_ORIGINS || "*").split(",");
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes("*") || allowed.includes(origin)) cb(null, true);
    else cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize(req.body);
  if (req.query) req.query = mongoSanitize(req.query);
  if (req.params) req.params = mongoSanitize(req.params);
  next();
});

app.use(compression());

app.get("/", (req, res) => {
  res.json({
    name: "Indian Medicines API",
    version: "1.0.0",
    docs: "/api/v1/medicines",
    time: new Date().toISOString()
  });
});

app.use("/api/v1/medicines", medicinesRouter);

app.use(notFound);
app.use(errorHandler);

export default app;