import mongoose from "mongoose";
import moongoose from "mongoose";

const SlotSchema = new mongoose.Schema (
  {
    slot_datetime: {
      type: Date,
      required:true,
      
    },
    duration_minutes: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      // giới hạn các giá trị hợp lệ cho status
      enum: ['available', 'booked', 'unavailable'],
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
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }

  }
)

const Slot = mongoose.model("Slot",SlotSchema)
export default Slot;
