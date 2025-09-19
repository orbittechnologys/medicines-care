import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema({
  name: String,
  strengthValue: Number,
  strengthUnit: String,
  strengthDisplay: String,
});

const packagingSchema = new mongoose.Schema({
  packType: String,
  quantity: Number,
  unit: String,
  description: String,
});

const pricingSchema = new mongoose.Schema({
  mrp: Number,
  currency: String,
});

const manufacturerSchema = new mongoose.Schema({
  name: String,
});

const medicineSchema = new mongoose.Schema({
  officialName: { type: String, required: true },
  activeIngredients: [ingredientSchema],
  dosageForm: String,
  category: String,
  systemType: String,
  manufacturer: manufacturerSchema,
  packaging: packagingSchema,
  pricing: pricingSchema,
  discontinued: Boolean,
});

// indexes
medicineSchema.index(
  {
    officialName: "text",
    "manufacturer.name": "text",
    "activeIngredients.name": "text",
    category: "text",
  },
  {
    name: "MedicineTextIndex",
    weights: {
      officialName: 10,
      "activeIngredients.name": 6,
      "manufacturer.name": 3,
      category: 2,
    },
    default_language: "english",
  }
);

medicineSchema.index({ dosageForm: 1, category: 1 });
medicineSchema.index({ "activeIngredients.name": 1, dosageForm: 1 });
medicineSchema.index({ "pricing.mrp": 1 });

export default mongoose.model("Medicine", medicineSchema);
