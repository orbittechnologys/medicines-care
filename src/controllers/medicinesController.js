import Medicine from "../models/medicineModel.js";
import { validationResult } from "express-validator";
import { LRUCache } from "lru-cache";

const cache = new LRUCache({
  max: 3000,
  ttl: 300_000,
});

export async function list(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, error: errors.array()[0].msg });
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
    sort = "relevance",
    count = "false",
    fuzzy = "false",
  } = req.query;

  const cacheKey = JSON.stringify(req.query);
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const filter = {};
  if (dosageForm)
    filter.dosageForm = new RegExp(`^${escapeRegex(dosageForm)}$`, "i");
  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  if (manufacturer)
    filter["manufacturer.name"] = new RegExp(escapeRegex(manufacturer), "i");
  if (ingredient)
    filter["activeIngredients.name"] = new RegExp(escapeRegex(ingredient), "i");
  if (discontinued === "true") filter.discontinued = true;
  if (discontinued === "false") filter.discontinued = { $ne: true };
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
    activeIngredients: 1,
  };

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  let query;
  if (q && fuzzy !== "true") {
    query = Medicine.find({ $text: { $search: q }, ...filter }, projection)
      .select({ score: { $meta: "textScore" } })
      .sort(
        sort === "relevance"
          ? { score: { $meta: "textScore" } }
          : sortSpec(sort)
      )
      .lean();
  } else {
    const regexFilter = { ...filter };
    if (q) {
      const r = new RegExp(escapeRegex(q), "i");
      regexFilter.$or = [
        { officialName: r },
        { "activeIngredients.name": r },
        { "manufacturer.name": r },
      ];
    }
    query = Medicine.find(regexFilter, projection).sort(sortSpec(sort)).lean();
  }

  const rows = await query.skip(skip).limit(limitNum + 1);
  const hasMore = rows.length > limitNum;
  const items = rows.slice(0, limitNum);

  let total = undefined;
  if (count === "true") {
    total = await Medicine.countDocuments(query.getQuery());
  }

  const payload = {
    success: true,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      hasMore: total != null ? skip + items.length < total : hasMore,
    },
    data: items,
  };

  cache.set(cacheKey, payload);
  return res.json(payload);
}

function sortSpec(sort) {
  if (sort === "price-asc") return { "pricing.mrp": 1 };
  if (sort === "price-desc") return { "pricing.mrp": -1 };
  return { officialName: 1 };
}

function escapeRegex(s) {
  return s?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "";
}
