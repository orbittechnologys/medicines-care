// quick-csv-server.js
// Node 18+ recommended. Install dependencies: npm install express csv-parse
import express from "express";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

/**
 * Configuration
 * - CSV_PATH: absolute or relative path to your CSV (default: ./A_Z_medicines_dataset_of_India.csv)
 * - PORT: port to run server on (default: 3030)
 */
const CSV_PATH = process.env.CSV_PATH || path.join(process.cwd(), "A_Z_medicines_dataset_of_India.csv");
const PORT = Number(process.env.PORT || 4000);

/**
 * Utility: normalize a string (safe lowercase trim)
 */
function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}

/**
 * Parse composition strings like:
 *   "Amoxycillin  (500mg)"
 *   "Ambroxol (30mg/5ml)"
 * or fallback to raw text.
 * Returns an object { name, strengthDisplay, strengthValue, strengthUnit }
 */
function parseComposition(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = /^\s*([^()]+?)\s*\(([^)]+)\)\s*$/.exec(s);
  if (!m) {
    return { name: s, strengthDisplay: undefined };
  }
  const name = m[1].trim();
  const strengthDisplay = m[2].trim(); // e.g., "500mg" or "30mg/5ml"
  const numMatch = /([\d.]+)/.exec(strengthDisplay);
  const strengthValue = numMatch ? Number(numMatch[1]) : undefined;
  let unit = strengthDisplay.replace(/[\d.\s]+/g, "");
  if (!unit) unit = undefined;
  return { name, strengthDisplay, strengthValue, strengthUnit: unit };
}

/**
 * Parse pack label like "strip of 10 tablets" -> { packType, quantity, unit, description }
 * If pattern not recognized, return { description: raw }
 */
function parsePackaging(label) {
  if (!label) return { description: undefined };
  const raw = String(label).trim();
  // Common pattern: "<word> of <number> <unit> ..." e.g. "strip of 10 tablets"
  const m = /(\w+)\s+of\s+(\d+)\s*([A-Za-z]+)(?:\s+(.*))?/i.exec(raw);
  if (!m) return { description: raw };
  const [, packType, quantity, unit, rest] = m;
  return {
    packType: packType.toLowerCase(),
    quantity: Number(quantity),
    unit: unit.toLowerCase(),
    description: rest ? `${packType} of ${quantity} ${unit} ${rest}` : raw
  };
}

/**
 * Load CSV into memory (synchronous parsing using csv-parse/sync)
 * Returns array of normalized rows.
 */
function loadCsv(csvPath) {
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found at", csvPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(csvPath, "utf8");
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  return records.map((r, i) => {
    const comp1 = parseComposition(r.short_composition1 || r.composition || "");
    const comp2 = parseComposition(r.short_composition2 || "");
    const packaging = parsePackaging(r.pack_size_label || "");
    const mrpRaw = r["price(₹)"] ?? r.price ?? r.Price ?? "";
    let mrp = undefined;
    if (mrpRaw !== undefined && mrpRaw !== "") {
      const cleaned = String(mrpRaw).replace(/[^\d.]/g, "");
      mrp = cleaned ? Number(cleaned) : undefined;
    }

    return {
      _rowIndex: i,
      id: r.id || r.ID || "",
      name: r.name || r.medicine_name || r.brand_name || "",
      name_lc: norm(r.name || r.medicine_name || r.brand_name || ""),
      price: mrp,
      manufacturer: r.manufacturer_name || r.manufacturer || "",
      manufacturer_lc: norm(r.manufacturer_name || r.manufacturer || ""),
      type: r.type || r.system || "",
      pack_size_label: r.pack_size_label || "",
      packaging,
      composition1: comp1,
      composition2: comp2,
      composition_text: ((r.short_composition1 || "") + " " + (r.short_composition2 || "")).trim(),
      composition_text_lc: norm((r.short_composition1 || "") + " " + (r.short_composition2 || "")),
      raw: r
    };
  });
}

/* ---- Start server ---- */
const data = loadCsv(CSV_PATH);
console.log(`Loaded ${data.length} rows from ${CSV_PATH}`);

const app = express();

/**
 * GET /quick/search
 * - name or q (required): substring search (case-insensitive) across name, manufacturer, compositions
 * - ingredient (optional): substring match in compositions only
 * - limit (optional): default 10, max 200
 * - page (optional): page number (1-based)
 *
 * Returns: { success, query, page, limit, totalMatched, data: [ ...rows minimal projection ... ] }
 */
app.get("/quick/search", (req, res) => {
  const qRaw = req.query.name ?? req.query.q ?? "";
  const ingredient = String(req.query.ingredient || "").trim().toLowerCase();
  const limit = Math.min(Math.max(1, Number(req.query.limit) || 10), 200);
  const page = Math.max(1, Number(req.query.page) || 1);

  if (!qRaw && !ingredient) {
    return res.status(400).json({ success: false, error: "Provide name/q or ingredient query parameter" });
  }
  const q = String(qRaw).trim().toLowerCase();

  // Filter
  const matched = [];
  for (const row of data) {
    let match = false;
    if (q) {
      if (row.name_lc.includes(q) || row.manufacturer_lc.includes(q) || row.composition_text_lc.includes(q)) match = true;
    }
    if (ingredient) {
      if (row.composition_text_lc.includes(ingredient)) match = true;
      else match = false; // if ingredient provided it must match composition
    }
    if (match) matched.push(row);
  }

  const totalMatched = matched.length;
  const start = (page - 1) * limit;
  const paged = matched.slice(start, start + limit).map(r => ({
    id: r.id,
    name: r.name,
    price: r.price,
    manufacturer: r.manufacturer,
    type: r.type,
    packaging: r.packaging,
    composition1: r.composition1,
    composition2: r.composition2
  }));

  res.json({
    success: true,
    query: qRaw,
    ingredient: req.query.ingredient || null,
    page,
    limit,
    totalMatched,
    data: paged
  });
});

/**
 * GET /quick/lookup/exact
 * - name (required): exact name match (case-insensitive)
 */
app.get("/quick/lookup/exact", (req, res) => {
  const name = String(req.query.name || "").trim();
  if (!name) return res.status(400).json({ success: false, error: "name query parameter required" });

  const lc = name.toLowerCase();
  const found = data.find(r => r.name_lc === lc);
  if (!found) {
    return res.status(404).json({ success: false, error: "Not found" });
  }

  // return full enriched object
  return res.json({
    success: true,
    data: {
      id: found.id,
      officialName: found.name,
      price: found.price,
      manufacturer: found.manufacturer,
      type: found.type,
      packaging: found.packaging,
      activeIngredients: [found.composition1, found.composition2].filter(Boolean),
      rawRow: found.raw
    }
  });
});

/**
 * GET /quick/lookup/by-ingredient
 * - ingredient (required): substring (case-insensitive) inside composition columns
 * - limit/page supported
 */
app.get("/quick/lookup/by-ingredient", (req, res) => {
  const ingredientRaw = String(req.query.ingredient || "").trim();
  if (!ingredientRaw) return res.status(400).json({ success: false, error: "ingredient query parameter required" });
  const ingredient = ingredientRaw.toLowerCase();
  const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 200);
  const page = Math.max(1, Number(req.query.page) || 1);

  const matched = data.filter(r => r.composition_text_lc.includes(ingredient));
  const start = (page - 1) * limit;
  const paged = matched.slice(start, start + limit).map(r => ({
    id: r.id,
    name: r.name,
    manufacturer: r.manufacturer,
    price: r.price,
    activeIngredients: [r.composition1, r.composition2].filter(Boolean)
  }));

  res.json({
    success: true,
    ingredient: ingredientRaw,
    page,
    limit,
    totalMatched: matched.length,
    data: paged
  });
});

/* Basic health route */
app.get("/quick/health", (req, res) => res.json({ success: true, rowsLoaded: data.length, uptime: process.uptime() }));

app.listen(PORT, () => {
  console.log(`Quick CSV server listening on http://localhost:${PORT}`);
  console.log("Examples:");
  console.log(`  /quick/search?name=augmentin&limit=5`);
  console.log(`  /quick/lookup/exact?name=Augmentin 625 Duo Tablet`);
  console.log(`  /quick/lookup/by-ingredient?ingredient=amoxycillin`);
});
