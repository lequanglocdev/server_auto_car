import mongoose from 'mongoose';

const InvoiceDetailSchema = new mongoose.Schema(
  {
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',   
      required: true,
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,

    },
    price: {
      type: Number,
      required: true,

    },
    quantity: {
      type: Number,
      default: 1,
      required: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'} }
)

const InvoiceDetail = mongoose.model('InvoiceDetail', InvoiceDetailSchema);

export default InvoiceDetail;
