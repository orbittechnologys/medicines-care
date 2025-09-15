import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { parse } from "csv-parse";
import { connectDB } from "../src/utils/db.js";
import Medicine from "../src/models/Medicine.js";

dotenv.config();

function parseComposition(s) {
  if (!s) return null;
  const raw = String(s).trim();
  const m = /^\s*([^()]+?)\s*\(([^)]+)\)\s*$/.exec(raw);
  if (!m) return { name: raw };
  const name = m[1].trim();
  const strengthDisplay = m[2].trim();
  const numMatch = /([\d.]+)/.exec(strengthDisplay);
  let strengthValue = numMatch ? Number(numMatch[1]) : undefined;
  let unit = strengthDisplay.replace(/[\d.\s]+/g, "");
  if (!unit) unit = undefined;
  return { name, strengthValue, strengthUnit: unit, strengthDisplay };
}

function inferDosageForm(name, packLabel) {
  const s = `${name} ${packLabel}`.toLowerCase();
  if (s.includes("tablet")) return "tablet";
  if (s.includes("capsule")) return "capsule";
  if (s.includes("syrup")) return "syrup";
  if (s.includes("injection")) return "injection";
  if (s.includes("drop")) return "drops";
  if (s.includes("cream")) return "cream";
  if (s.includes("ointment")) return "ointment";
  if (s.includes("suspension")) return "suspension";
  if (s.includes("gel")) return "gel";
  if (s.includes("spray")) return "spray";
  return undefined;
}

function parsePackaging(label) {
  if (!label) return { description: undefined };
  const l = String(label).trim();
  const m = /(\w+)\s+of\s+(\d+)\s*([A-Za-z]+)(?:\s+(.*))?/i.exec(l);
  if (!m) return { description: l };
  const [, packType, quantity, unit, rest] = m;
  return {
    packType: packType?.toLowerCase(),
    quantity: Number(quantity),
    unit: unit?.toLowerCase(),
    description: rest ? `${packType} of ${quantity} ${unit} ${rest}` : l
  };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }
  await connectDB();

  const argPath = process.argv[2] || "A_Z_medicines_dataset_of_India.csv";
  const csvPath = path.isAbsolute(argPath) ? argPath : path.join(process.cwd(), argPath);

  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found at", csvPath);
    process.exit(1);
  }

  let imported = 0;
  const parser = fs.createReadStream(csvPath).pipe(parse({ columns: true, trim: true }));

  for await (const r of parser) {
    const doc = {
      sourceId: r.id || r.ID || r._id,
      officialName: r.name || r.medicine_name || r.brand_name,
      dosageForm: inferDosageForm(r.name, r["pack_size_label"]),
      systemType: r.type || undefined,
      manufacturer: { name: r.manufacturer_name || r.manufacturer || undefined },
      discontinued: String(r.Is_discontinued || r.discontinued || "").toLowerCase() === "true",
      pricing: {
        mrp: r["price(₹)"] ? Number(String(r["price(₹)"]).replace(/[^\d.]/g, "")) : undefined,
        currency: "INR"
      },
      packaging: parsePackaging(r.pack_size_label),
      activeIngredients: [parseComposition(r.short_composition1), parseComposition(r.short_composition2)].filter(Boolean),
      category: undefined,
      therapeuticUses: [],
      formulation: undefined,
      synonyms: []
    };

    if (!doc.officialName) continue;

    await Medicine.updateOne(
      { officialName: doc.officialName },
      { $set: doc },
      { upsert: true }
    );
    imported++;
    if (imported % 5000 === 0) console.log(`Imported ${imported}...`);
  }

  console.log("✅ Import completed. Total:", imported);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});