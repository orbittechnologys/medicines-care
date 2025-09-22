export default function apiKeyMiddleware(req, res, next) {
  // ✅ Allow CORS preflight requests to pass through
  if (req.method === "OPTIONS") {
    return next();
  }

  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, error: "Invalid API Key" });
  }
  next();
}
