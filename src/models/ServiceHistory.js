import mongoose from "mongoose";

const ServiceHistorySchema = new mongoose.Schema(
  {
    vehicle_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",

      required: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Invoice",
      required: true,
    },
    service_date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: { type: String, default: "" },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const ServiceHistory = mongoose.model("ServiceHistory", ServiceHistorySchema);
export default ServiceHistory;
