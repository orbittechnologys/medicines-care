import fs from "fs";
import csv from "csv-parser";
import dotenv from "dotenv";
import { connectDB } from "../src/utils/db.js";
import Medicine from "../src/models/medicineModel.js";

dotenv.config();

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run import:csv <file>");
  process.exit(1);
}

(async () => {
  await connectDB();

  const medicines = [];
  fs.createReadStream(file)
    .pipe(csv())
    .on("data", (row) => medicines.push(row))
    .on("end", async () => {
      try {
        await Medicine.insertMany(medicines);
        console.log(`✅ Imported ${medicines.length} medicines`);
        process.exit(0);
      } catch (err) {
        console.error("❌ Import failed", err);
        process.exit(1);
      }
    });
})();
