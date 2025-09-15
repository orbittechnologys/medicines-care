import mongoose from "mongoose";

const IngredientSchema = new mongoose.Schema({
  name: { type: String, index: true },
  strengthValue: { type: Number, required: false },
  strengthUnit: { type: String, required: false },
  strengthDisplay: { type: String }
}, { _id: false });

const PackagingSchema = new mongoose.Schema({
  packType: String,
  quantity: Number,
  unit: String,
  description: String,
}, { _id: false });

const PricingSchema = new mongoose.Schema({
  mrp: { type: Number, index: true },
  currency: { type: String, default: "INR" },
  perUnitPrice: { type: Number }
}, { _id: false });

const ManufacturerSchema = new mongoose.Schema({
  name: { type: String, index: true },
  address: String,
  licenseNo: String
}, { _id: false });

const MedicineSchema = new mongoose.Schema({
  sourceId: { type: String, index: true },
  officialName: { type: String, required: true, index: true },
  dosageForm: { type: String, index: true },
  systemType: { type: String, index: true },
  therapeuticUses: [{ type: String }],
  category: { type: String, index: true },
  manufacturer: ManufacturerSchema,
  formulation: { type: String },
  activeIngredients: [IngredientSchema],
  pricing: PricingSchema,
  packaging: PackagingSchema,
  gstPercentage: { type: Number },
  hsnCode: { type: String },
  schedule: { type: String },
  discontinued: { type: Boolean, default: false },
  synonyms: [{ type: String, index: true }]
}, {
  timestamps: true
});

MedicineSchema.index({
  officialName: "text",
  "manufacturer.name": "text",
  "activeIngredients.name": "text",
  category: "text"
}, {
  name: "MedicineTextIndex",
  weights: {
    officialName: 10,
    "activeIngredients.name": 6,
    "manufacturer.name": 3,
    category: 2
  },
  default_language: "english"
});

// pricing.mrp already indexed in the PricingSchema via `index: true`,
// so avoid duplicating the index here.
MedicineSchema.index({ dosageForm: 1, category: 1 });
MedicineSchema.index({ "activeIngredients.name": 1, dosageForm: 1 });


export default mongoose.model("Medicine", MedicineSchema);