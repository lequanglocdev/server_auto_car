import mongoose from 'mongoose'  ;

const PriceLineSchema = new mongoose.Schema(
  {
    price_header_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PriceHeader',
      required: true,
    },
    server_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Server',
      required: true,
    }

  },
  {timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

const PriceLine = mongoose.model('PriceLine', PriceLineSchema);
export default PriceLine;
