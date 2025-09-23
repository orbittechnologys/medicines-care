import Pincode from "../models/pincodeModel.js";
import { LRUCache } from "lru-cache";

const cache = new LRUCache({
  max: 5000,
  ttl: 86_400_000, // 24 hours in ms
});

export const getPincode = async (req, res) => {
  try {
    const { code } = req.params;

    const cacheKey = `pincode:${code}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        fromCache: true,
        ...cached,
      });
    }

    const records = await Pincode.find({ pincode: code }).lean();

    if (!records || records.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: `Pincode ${code} not found` });
    }

    const payload = {
      count: records.length,
      data: records,
    };

    cache.set(cacheKey, payload);

    return res.status(200).json({ success: true, ...payload });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: `Server Error: ${err.message}` });
  }
};
