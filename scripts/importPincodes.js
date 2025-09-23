import fs from "fs";
import path from "path";
import https from "https";
import csv from "csv-parser";
import mongoose from "mongoose";
import Pincode from "../src/models/pincodeModel.js";
import dotenv from "dotenv";

dotenv.config();

const CSV_URL =
  "https://raw.githubusercontent.com/saravanakumargn/All-India-Pincode-Directory/master/all-india-pincode-html-csv.csv";

const LOCAL_FILE = path.resolve("data/all_india_pincode.csv");

// 1) Ensure data folder exists
if (!fs.existsSync(path.dirname(LOCAL_FILE))) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
}

// 2) Download CSV if not already present
async function downloadCSV() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(LOCAL_FILE)) {
      console.log("📂 CSV already exists, skipping download");
      return resolve();
    }
    const file = fs.createWriteStream(LOCAL_FILE);
    https
      .get(CSV_URL, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download CSV: ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log("✅ CSV downloaded:", LOCAL_FILE);
          resolve();
        });
      })
      .on("error", reject);
  });
}

// 3) Parse CSV and bulk upsert into MongoDB
async function importToMongo() {
  return new Promise((resolve, reject) => {
    const ops = [];
    let count = 0;
    let inserted = 0;

    const stream = fs.createReadStream(LOCAL_FILE).pipe(csv());

    stream
      .on("data", (row) => {
        count++;

        // ✅ Correct mapping based on your CSV headers
        const record = {
          pincode: String(row.pincode || "").trim(),
          city: row.officename || "",
          district: row.Districtname || "",
          state: row.statename || "",
          country: "India",
        };

        if (record.pincode && record.state) {
          ops.push({
            updateOne: {
              filter: { pincode: record.pincode, city: record.city },
              update: { $setOnInsert: record },
              upsert: true,
            },
          });
        }

        // flush every 10k rows
        if (ops.length >= 10000) {
          stream.pause();
          Pincode.bulkWrite(ops, { ordered: false })
            .then(() => {
              inserted += ops.length;
              console.log(`✅ Inserted ${inserted} records so far...`);
              ops.length = 0; // clear batch
              stream.resume();
            })
            .catch((err) => reject(err));
        }
      })
      .on("end", async () => {
        try {
          if (ops.length > 0) {
            await Pincode.bulkWrite(ops, { ordered: false });
            inserted += ops.length;
          }
          console.log(
            `🚀 Import complete. Processed ${count} rows, inserted ${inserted} records.`
          );
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
}

// 4) Main runner
(async () => {
  try {
    const MONGO_URI =
      process.env.MONGO_URI ||
      "mongodb://meduser:MedPass123!@4.213.65.175:27017/indianMedicine1";

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    await downloadCSV();
    await importToMongo();

    await mongoose.disconnect();
    console.log("🎉 All done!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
