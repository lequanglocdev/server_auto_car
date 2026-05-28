// models/Slot.js
import mongoose from "mongoose";

const SlotSchema = new mongoose.Schema(
  {
    start_time: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["available", "booked", "unavailable"], //
      default: "available",
    },
    capacity: {
      type: Number,
      default: 1,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Slot = mongoose.model("Slot", SlotSchema);
export default Slot;
