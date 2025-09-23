import mongoose from "mongoose";

const pincodeSchema = new mongoose.Schema(
  {
    pincode: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true }, 
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, default: "India", trim: true },
  },
  { timestamps: true }
);

pincodeSchema.index({ pincode: 1 });

export default mongoose.model("Pincode", pincodeSchema);
