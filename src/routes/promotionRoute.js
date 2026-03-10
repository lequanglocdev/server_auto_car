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
  toggkePromotionHeaderStatus,
  toggkePromotionLineStatus,
  toggkePromotionDetailStatus,
} from "../controllers/promotionController.js";

const router = express.Router();

// ===== Promotion Header =====
router.get("/", [isAdmin], getAllPromotions);
router.post("/", [isAdmin], addPromotionHeader);
router.put("/:promotionHeaderId", [isAdmin], updatePromotionHeader);
router.delete("/:promotionHeaderId", [isAdmin], deletePromotionHeader);  
router.patch("/head/:id/toggle",[isAdmin],toggkePromotionHeaderStatus);

// ===== Promotion Line =====
router.get("/:promotionHeaderId/line", [isAdmin], getAllPromotionLine);
router.post("/:promotionHeaderId/line", [isAdmin], addPromotionLine);
router.put("/line/:promotionLineId", [isAdmin], updatePromotionLine);
router.delete("/line/:promotionLineId", [isAdmin], deletePromotionLine);
router.patch("/line/:id/toggle", [isAdmin], toggkePromotionLineStatus);

// ===== Promotion Detail =====
router.get("/line/:promotionLineId/detail", [isAdmin], getPromotionDetail);
router.post("/line/:promotionLineId/detail", [isAdmin], addPromotionDetail);
router.put("/detail/:promotionDetailId", [isAdmin], updatePromotionDetail);
router.delete("/detail/:promotionDetailId", [isAdmin], deletePromotionDetail);
router.patch("/detail/:id/toggle", [isAdmin], toggkePromotionDetailStatus);
export default router;
