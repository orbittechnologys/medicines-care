import { createServer } from "http";
import app from "./app.js";
import { connectDB } from "./utils/db.js";

const PORT = process.env.PORT || 4036;

(async () => {
  await connectDB();
  const server = createServer(app);
  server.listen(PORT, () => {
    console.log(`✅ Indian Medicines API listening on Port: ${PORT}`);
  });
})();
