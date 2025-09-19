import fs from "fs";
import csv from "csv-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Medicine from "../src/models/medicineModel.js";

dotenv.config();

async function importCSV(filePath) {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("✅ Connected to MongoDB");

  const medicines = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      medicines.push({
        officialName: row.officialName,
        dosageForm: row.dosageForm,
        category: row.category,
        systemType: row.systemType,
        manufacturer: { name: row.manufacturer },
        packaging: {
          packType: row.packType,
          quantity: Number(row.quantity) || 0,
          unit: row.unit,
          description: row.packagingDescription,
        },
        pricing: {
          mrp: Number(row.mrp) || 0,
          currency: row.currency || "INR",
        },
        discontinued: row.discontinued === "true",
      });
    })
    .on("end", async () => {
      try {
        await Medicine.insertMany(medicines, { ordered: false });
        console.log(`✅ Imported ${medicines.length} records`);
      } catch (err) {
        console.error("❌ Import error:", err.message);
      } finally {
        mongoose.disconnect();
      }
    });
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("❌ Please provide a CSV file path");
  process.exit(1);
}

importCSV(filePath);
