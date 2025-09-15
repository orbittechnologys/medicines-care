/* import Medicine from "../models/Medicine.js";
import { LRUCache } from "lru-cache";
import { validationResult } from "express-validator";

const cache = new LRUCache({ max: 500, ttl: 1000 * 30 }); // cache results for 30s

// ✅ Get medicine by MongoDB ID
export async function getById(req, res) {
  const { id } = req.params;
  const doc = await Medicine.findById(id, {
    officialName: 1,
    dosageForm: 1,
    systemType: 1,
    manufacturer: 1,
    pricing: 1,
    packaging: 1,
    activeIngredients: 1
  }).lean();

  if (!doc) {
    return res.status(404).json({ success: false, error: "Medicine not found" });
  }

  return res.json({ success: true, data: doc });
}

// ✅ Exact lookup by medicine name
export async function lookupExact(req, res) {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ success: false, error: "name is required" });
  }

  const doc = await Medicine.findOne(
    { officialName: new RegExp(`^${escapeRegex(name)}$`, "i") },
    {
      officialName: 1,
      dosageForm: 1,
      systemType: 1,
      manufacturer: 1,
      pricing: 1,
      packaging: 1,
      activeIngredients: 1
    }
  ).lean();

  if (!doc) {
    return res.status(404).json({ success: false, error: "Not found" });
  }

  return res.json({ success: true, data: doc });
}

// ✅ Search medicines (list with filters)
export async function list(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const {
    q,
    dosageForm,
    category,
    manufacturer,
    ingredient,
    minPrice,
    maxPrice,
    discontinued,
    page = 1,
    limit = 20,
    sort = "relevance"
  } = req.query;

  const cacheKey = JSON.stringify(req.query);
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const filter = {};

  if (dosageForm) filter.dosageForm = new RegExp(`^${escapeRegex(dosageForm)}$`, "i");
  if (category) filter.category = new RegExp(escapeRegex(category), "i");
  if (manufacturer) filter["manufacturer.name"] = new RegExp(escapeRegex(manufacturer), "i");
  if (ingredient) filter["activeIngredients.name"] = new RegExp(escapeRegex(ingredient), "i");
  if (typeof discontinued !== "undefined") filter.discontinued = discontinued === "true";

  if (minPrice || maxPrice) {
    filter["pricing.mrp"] = {};
    if (minPrice) filter["pricing.mrp"].$gte = Number(minPrice);
    if (maxPrice) filter["pricing.mrp"].$lte = Number(maxPrice);
  }

  const projection = {
    officialName: 1,
    dosageForm: 1,
    systemType: 1,
    manufacturer: 1,
    pricing: 1,
    packaging: 1,
    category: 1,
    activeIngredients: 1
  };

  const skip = (Number(page) - 1) * Number(limit);

  let sortSpec = {};
  if (q && sort === "relevance") {
    sortSpec = { score: { $meta: "textScore" } };
  } else if (sort === "price-asc") {
    sortSpec = { "pricing.mrp": 1 };
  } else if (sort === "price-desc") {
    sortSpec = { "pricing.mrp": -1 };
  } else {
    sortSpec = { officialName: 1 };
  }

  const query = Medicine.find(filter, projection).lean();

  if (q) {
    query.where({
      $or: [
        { $text: { $search: q } },
        { officialName: new RegExp(escapeRegex(q), "i") },
        { "activeIngredients.name": new RegExp(escapeRegex(q), "i") },
        { "manufacturer.name": new RegExp(escapeRegex(q), "i") }
      ]
    });
    query.select({ score: { $meta: "textScore" } });
  }

  const [items, total] = await Promise.all([
    query.sort(sortSpec).skip(skip).limit(Number(limit)),
    Medicine.countDocuments(filter)
  ]);

  const payload = {
    success: true,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasMore: skip + items.length < total
    },
    data: items
  };

  cache.set(cacheKey, payload);
  return res.json(payload);
}

// ✅ Helper
function escapeRegex(s) {
  return s?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "";
}



 */

///////////////////////////////////////

import Medicine from "../models/Medicine.js";
import { LRUCache } from "lru-cache";
import { validationResult } from "express-validator";

const cache = new LRUCache({ max: 500, ttl: 1000 * 30 }); // 30s cache for hot queries

// normalize query view param (trim and lowercase)
function getView(req) {
  const v = req.query?.view;
  if (!v) return "";
  return String(v).trim().toLowerCase();
}

// ------------------ Patient view helpers ------------------

const FORM_ICONS = {
  tablet: "💊",
  capsule: "💊",
  syrup: "🍼",
  suspension: "🍼",
  drops: "🍼",
  injection: "💉",
  vial: "💉",
  default: "💊"
};

const FORM_COLORS = {
  tablet: "#FFD54F",
  capsule: "#FFD54F",
  syrup: "#81D4FA",
  suspension: "#81D4FA",
  drops: "#B2EBF2",
  injection: "#FFCDD2",
  vial: "#FFCDD2",
  default: "#E0E0E0"
};

function formatINR(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
  } catch {
    return `₹${Number(value).toFixed(2)}`;
  }
}

function getIconAndColor(dosageForm) {
  if (!dosageForm) return { icon: FORM_ICONS.default, color: FORM_COLORS.default };
  const key = String(dosageForm).toLowerCase();
  return { icon: FORM_ICONS[key] || FORM_ICONS.default, color: FORM_COLORS[key] || FORM_COLORS.default };
}

function formatIngredients(activeIngredients = []) {
  return (activeIngredients || [])
    .filter(Boolean)
    .map((ing) => {
      const name = ing.name || "";
      const strength = ing.strengthDisplay || (ing.strengthValue ? `${ing.strengthValue}${ing.strengthUnit || ""}` : "");
      return (name + (strength ? ` ${strength}` : "")).trim();
    });
}

function packagingDescription(packaging = {}) {
  if (!packaging) return undefined;
  if (packaging.description) return packaging.description;
  const parts = [];
  if (packaging.packType) parts.push(packaging.packType);
  if (typeof packaging.quantity !== "undefined") parts.push(`of ${packaging.quantity}`);
  if (packaging.unit) parts.push(packaging.unit);
  return parts.length ? parts.join(" ") : undefined;
}

function formatPatientView(med) {
  if (!med) return null;

  const { icon, color } = getIconAndColor(med.dosageForm || med.packaging?.packType);
  const ingredients = formatIngredients(med.activeIngredients);
  const priceStr = med.pricing?.mrp ? formatINR(med.pricing.mrp) : undefined;
  const packDesc = packagingDescription(med.packaging);

  const priceWithPack = priceStr ? (packDesc ? `${priceStr} (${packDesc})` : `${priceStr}`) : (packDesc || undefined);

  return {
    Name: med.officialName || med.name || null,
    Form: med.dosageForm
      ? String(med.dosageForm).charAt(0).toUpperCase() + String(med.dosageForm).slice(1)
      : (med.packaging?.packType || null),
    Icon: icon,
    Color: color,
    Ingredients: ingredients,
    Price: priceWithPack,
    Manufacturer: med.manufacturer?.name || null
  };
}

// ------------------ Controllers ------------------

export async function getById(req, res) {
  const { id } = req.params;
  const view = getView(req);

  const doc = await Medicine.findById(id).lean();
  if (!doc) return res.status(404).json({ success: false, error: "Medicine not found" });

  if (view === "patient") {
    const patient = formatPatientView(doc);
    return res.json({ success: true, data: patient });
  }

  return res.json({ success: true, data: doc });
}

export async function lookupExact(req, res) {
  const { name } = req.query;
  const view = getView(req);

  if (!name) return res.status(400).json({ success: false, error: "name is required" });
  const doc = await Medicine.findOne({ officialName: new RegExp(`^${escapeRegex(name)}$`, "i") }).lean();
  if (!doc) return res.status(404).json({ success: false, error: "Not found" });

  if (view === "patient") {
    const patient = formatPatientView(doc);
    return res.json({ success: true, data: patient });
  }

  return res.json({ success: true, data: doc });
}

export async function list(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const {
    q,
    dosageForm,
    category,
    manufacturer,
    ingredient,
    minPrice,
    maxPrice,
    discontinued,
    page = 1,
    limit = 20,
    sort = "relevance"
  } = req.query;
  const view = getView(req);

  const cacheKey = JSON.stringify(req.query);
  const cached = cache.get(cacheKey);
  if (cached) {
    if (view === "patient") {
      const transformed = { ...cached, data: cached.data.map(formatPatientView) };
      return res.json(transformed);
    }
    return res.json(cached);
  }

  const filter = {};

  if (dosageForm) filter.dosageForm = new RegExp(`^${escapeRegex(dosageForm)}$`, "i");
  if (category) filter.category = new RegExp(escapeRegex(category), "i");
  if (manufacturer) filter["manufacturer.name"] = new RegExp(escapeRegex(manufacturer), "i");
  if (ingredient) filter["activeIngredients.name"] = new RegExp(escapeRegex(ingredient), "i");
  if (typeof discontinued !== "undefined") filter.discontinued = discontinued === "true";

  if (minPrice || maxPrice) {
    filter["pricing.mrp"] = {};
    if (minPrice) filter["pricing.mrp"].$gte = Number(minPrice);
    if (maxPrice) filter["pricing.mrp"].$lte = Number(maxPrice);
  }

    const projection = { officialName: 1, dosageForm: 1, systemType: 1, manufacturer: 1, pricing: 1, packaging: 1, category: 1, activeIngredients: 1 };
  const skip = (Number(page) - 1) * Number(limit);

  // Build the final filter which includes q if provided
  const finalFilter = { ...filter };

  if (q) {
    // Prefer text search if available; but do not nest $text inside $or with other operators directly.
    // We'll create an $or with regexes AND also include $text as separate top-level condition combined with $or-like semantics.
    // Some Mongo setups disallow mixing $text inside $or in certain ways; to be safe we try $text first, and if that returns nothing,
    // the client will still get regex matches from the other fields in the $or.
    const regex = new RegExp(escapeRegex(q), "i");
    // create an $or for regex matches
    finalFilter.$or = [
      { officialName: regex },
      { "activeIngredients.name": regex },
      { "manufacturer.name": regex }
    ];
    // add a $text search in addition (safe at top-level)
    // Note: having both $text and $or will work because we are merging them into the same filter object.
    // Mongo will treat both conditions as AND by default, so we want results that match ( $text OR regexes ).
    // To simulate text-OR-regex behavior, we use $expr with $or on server versions that support it OR we fallback to regex only.
    // Simpler safe approach: if text index exists we will rely on $text alone for relevance sort.
  }

  let sortSpec = {};
  if (q && sort === "relevance") {
    // textScore sort if text used; otherwise default alphabetical
    sortSpec = { score: { $meta: "textScore" } };
  } else if (sort === "price-asc") {
    sortSpec = { "pricing.mrp": 1 };
  } else if (sort === "price-desc") {
    sortSpec = { "pricing.mrp": -1 };
  } else {
    sortSpec = { officialName: 1 };
  }

  // Build query for data
  let query = Medicine.find(finalFilter, projection).lean();

  if (q) {
    // If text index exists, try to include text search for better relevance.
    // Use a try/catch around $text to avoid throwing on servers that reject it.
    try {
      // Use $text only for sorting and relevance; include it as a separate filter with $or-like effect by using $text OR the $or regex
      // To simplify, add $text as $or's first condition by constructing a $or at top-level:
      query = Medicine.find({
        $or: [
          { $text: { $search: q } },
          { officialName: new RegExp(escapeRegex(q), "i") },
          { "activeIngredients.name": new RegExp(escapeRegex(q), "i") },
          { "manufacturer.name": new RegExp(escapeRegex(q), "i") }
        ]
      }, projection).lean();

      if (sort === "relevance") {
        query = query.select({ score: { $meta: "textScore" } });
      }
    } catch (err) {
      // fallback to regex-only if $text causes problems
      query = Medicine.find(finalFilter, projection).lean();
    }
  }

  const [items, total] = await Promise.all([
    query.sort(sortSpec).skip(skip).limit(Number(limit)),
    // Use the same filter used by the query to count
    // If query was constructed with $or/$text above, pull its query object:
    Medicine.countDocuments(query.getQuery())
  ]);


  const payload = {
    success: true,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasMore: skip + items.length < total
    },
    data: view === "patient" ? items.map(formatPatientView) : items
  };

  cache.set(cacheKey, payload);
  return res.json(payload);
}

function escapeRegex(s) {
  return s?.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&") || "";
}
