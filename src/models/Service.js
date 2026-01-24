import mongoose from "mongoose";

const ServericeSchema = new mongoose.Schema(
  {
    service_code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    time_required: { type: Number, required: true },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
)

const Service = mongoose.model("Service", ServericeSchema);
export default Service;
