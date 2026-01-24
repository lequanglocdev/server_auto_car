import mongoose from "mongoose";

const PromotionLineSchema = new mongoose.Schema(
  {
    promotion_header_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromotionHeader",
      required: true,
    },
    discount_type: {
      type: String,
      enum: ["percentage", "fixed"], // Adjust types as necessary Giảm giá theo phần trăm và giảm giá cố định
      required: true,
    },
    description: { type: String, default: "" },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const PromotionLine = mongoose.model("PromotionLine", PromotionLineSchema);
export default PromotionLine;
