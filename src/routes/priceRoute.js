import express from "express";
import isAdmin from "../middlewares/checkAdmin.js";
import {
  addPriceHeader,
  addPriceLine,
  deletePriceHeader,
  deletePriceLine,
  getAllPriceHeader,
  getPriceLineByHeader,
  updatePriceHeader,
  updatePriceLine,
} from "../controllers/priceController.js";

const router = express.Router();

router.post("/", [isAdmin], addPriceHeader);
router.put("/:priceHeaderId", [isAdmin], updatePriceHeader);
router.delete("/:priceHeaderId", [isAdmin], deletePriceHeader);
router.get("/", [isAdmin], getAllPriceHeader);

router.post("/:priceHeaderId/line", [isAdmin], addPriceLine);
router.put("/:priceHeaderLineId", [isAdmin], updatePriceLine);
router.delete("/:priceHeaderLineId", [isAdmin], deletePriceLine);
router.get("/:priceHeaderId/line", [isAdmin], getPriceLineByHeader);

export default router
