import { createServer } from "http";
import app from "./app.js";
import { connectDB } from "./utils/db.js";

const PORT = process.env.PORT || 5120;

(async () => {
  await connectDB();
  const server = createServer(app);
  server.listen(PORT, () => {
    console.log(`✅ Indian Medicines API listening on http://localhost:${PORT}`);
  });
})();
