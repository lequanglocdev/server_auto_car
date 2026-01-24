import { application } from "express";
import mongoose from "mongoose";

const PromotionDetailSchema = new mongoose.Schema(
  {
    promotion_line_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromotionLine", 
      required: true,
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    application_rank_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerRank",  
      required: true,
    },
    discount_value: { type: Number, required: true },
    min_order_value: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const PromotionDetail = mongoose.model("PromotionDetail", PromotionDetailSchema);   
export default PromotionDetail;
