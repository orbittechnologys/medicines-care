export default function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err.stack || err);
  res.status(500).json({ success: false, message: "Server Error" });
}
