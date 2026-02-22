import express from "express";
import isAdmin from "../middlewares/checkAdmin.js";

import {
  addPromotionHeader,
  getAllPromotions,
  updatePromotionHeader,
  deletePromotionHeader,
  getAllPromotionLine,
  addPromotionLine,
  updatePromotionLine,
  deletePromotionLine,
  getPromotionDetail,
  addPromotionDetail,
  updatePromotionDetail,
  deletePromotionDetail,
} from "../controllers/promotionController.js";

const router = express.Router();

// ===== Promotion Header =====
router.get("/", [isAdmin], getAllPromotions);
router.post("/", [isAdmin], addPromotionHeader);
router.put("/:promotionHeaderId", [isAdmin], updatePromotionHeader);
router.delete("/:promotionHeaderId", [isAdmin], deletePromotionHeader);

// ===== Promotion Line =====
router.get("/:promotionHeaderId/line", [isAdmin], getAllPromotionLine);
router.post("/:promotionHeaderId/line", [isAdmin], addPromotionLine);
router.put("/line/:promotionLineId", [isAdmin], updatePromotionLine);
router.delete("/line/:promotionLineId", [isAdmin], deletePromotionLine);

// ===== Promotion Detail =====
router.get("/line/:promotionLineId/detail", [isAdmin], getPromotionDetail);
router.post("/line/:promotionLineId/detail", [isAdmin], addPromotionDetail);
router.put("/detail/:promotionDetailId", [isAdmin], updatePromotionDetail);
router.delete("/detail/:promotionDetailId", [isAdmin], deletePromotionDetail);

export default router;
