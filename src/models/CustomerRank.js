import mongoose from "mongoose";

const CustomerRankSchema = new mongoose.Schema(
  {
    rank_name: {
      type: String,
      required: true,
      unique: true,
    },
    min_spending: {
      type: Number,
      required: true,
    },
    discount_rate: {
      type: Number,
      required: true,
    },
    description: String,
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

const CustomerRank = mongoose.model('CustomerRank', CustomerRankSchema);
export default CustomerRank;
