import express from "express";
import isAdmin from "../middlewares/checkAdmin.js";
import {
  addPriceHeader,
  addPriceLine,
  deletePriceHeader,
  deletePriceLine,
  getAllPriceHeader,
  getPriceLineByHeader,
  togglePriceLineStatus,
  // togglePriceLineStatus,
  updatePriceHeader,
  updatePriceLine,
} from "../controllers/priceController.js";

const router = express.Router();

router.post("/", [isAdmin], addPriceHeader);
router.put("/:priceHeaderId", [isAdmin], updatePriceHeader);
router.delete("/:priceHeaderId", [isAdmin], deletePriceHeader);
router.get("/", [isAdmin], getAllPriceHeader);

router.post("/:priceHeaderId/line", [isAdmin], addPriceLine);
router.put("/line/:priceLineId", [isAdmin], updatePriceLine);
router.delete("/line/:priceLineId", [isAdmin], deletePriceLine);
router.get("/:priceHeaderId/line", [isAdmin], getPriceLineByHeader);
router.patch("/line/:id/toggle", [isAdmin], togglePriceLineStatus);

export default router
