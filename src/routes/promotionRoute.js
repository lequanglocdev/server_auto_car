import express from "express"
import isAdmin from "../middlewares/checkAdmin"
import { addPriceHeader } from "../controllers/priceController"
import { addPromotionLine, deletePromotionDetail, deletePromotionHeader, deletePromotionLine, getAllPromotionLine, getAllPromotions, getPromotionDetail, updatePromotionDetail, updatePromotionHeader, updatePromotionLine } from "../controllers/promotionController"

const router = express.Router()

router.get("/",[isAdmin],getAllPromotions)
router.post("/:promotionHeaderId",[isAdmin],addPriceHeader)
router.put("/:promotionHeaderId",[isAdmin],updatePromotionHeader)
router.delete("/:promotionHeaderId",[isAdmin],deletePromotionHeader)

router.get("/line",[isAdmin],getAllPromotionLine)
router.post("/:promotionHeaderId/line",[isAdmin],addPromotionLine)
router.put("/line/:promotionLineId",[isAdmin],updatePromotionLine)
router.delete("/line/:promotionLineId",[isAdmin],deletePromotionLine)

router.get("/line/details/:promotionLineId",[isAdmin],getPromotionDetail)
router.post("/:promotionHeaderId/detail",[isAdmin],addPromotionLine)
router.put("/detail/:promotionDetailId",[isAdmin],updatePromotionDetail)
router.delete("detail/:promotionDetailId",[isAdmin],deletePromotionDetail)
