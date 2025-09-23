import express from "express";
import { getPincode } from "../controllers/pincodeController.js";

const router = express.Router();

router.get("/:code", getPincode);

export default router;
