import { Router } from "express";
import { query, param } from "express-validator";
import { getById, list, lookupExact } from "../controllers/medicinesController.js";
import { requireApiKey } from "../middleware/apiKey.js";
import { importFromCsvHandler } from "./private/importHandler.js";

const router = Router();

// Add near the top after imports in src/routes/medicines.js
router.get("/_debug/echo", (req, res) => {
  // Shows raw query + types so you can see what's being sent
  res.json({
    query: req.query,
    queryTypes: Object.fromEntries(Object.entries(req.query).map(([k,v]) => [k, typeof v]))
  });
});


router.get("/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit 1-100"),
    query("minPrice").optional().isFloat({ min: 0 }).withMessage("minPrice >= 0"),
    query("maxPrice").optional().isFloat({ min: 0 }).withMessage("maxPrice >= 0"),
    query("sort").optional().isIn(["relevance", "price-asc", "price-desc"]).withMessage("invalid sort")
  ],
  list
);

router.get("/lookup/exact", lookupExact);

router.get("/:id", [param("id").isMongoId().withMessage("invalid id")], getById);

// Add this near the other routes in src/routes/medicines.js
// Admin: Import from CSV (requires x-api-key)
router.post("/_import", requireApiKey, importFromCsvHandler);


export default router;