export function requireApiKey(req, res, next) {
  const key = req.get("x-api-key");
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}