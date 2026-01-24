import mongoose from "mongoose";

const vehicleTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: false
  },
  is_deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  
});

const VehicleType = mongoose.model('VehicleType', vehicleTypeSchema);
export default VehicleType;
