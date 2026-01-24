import mongoose from 'mongoose';

const PromotionHeaderSchema = new mongoose.Schema(
  {
    promotion_code: {type: String, required: true, unique: true},
    name: {type: String, required: true},
    description: {type: String, default: ''},
    is_active: {type: Boolean, default: true},
    is_deleted: {type: Boolean, default: false},
    start_date: {type: Date, required: true},
    end_date: {type: Date, required: true},
  },
  {timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'} }
)

const PromotionHeader = mongoose.model('PromotionHeader', PromotionHeaderSchema);
export default PromotionHeader;
