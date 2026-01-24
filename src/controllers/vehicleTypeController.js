import VehicleType from '../models/VehicleType.js';

export const getAllVehicleTypes = async (req, res) => {
  try {
    const vehicleTypes = await VehicleType.find({ is_deleted: false });
    res.json(vehicleTypes);
  } catch (error) {
    console.error('Lỗi khi lấy loại xe:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}


/* {
     "vehicle_type_name": "adb",
     "description": "không có gì hết" 
    }
*/
export const addVehicleType = async (req, res) => {
  try {
    const { vehicle_type_name, description } = req.body;
    // kiem tra loai xe da ton tai chua
    let existingVehicleType = await VehicleType.findOne({ vehicle_type_name });
    if(existingVehicleType){
      return  res.status(400).json({message: 'Loại xe này đã tồn tại'});
    }
    // tao moi loai xe
    const vehicleType = new VehicleType({
      vehicle_type_name,
      description,
      is_deleted: false,
      updated_at: Date.now()
    });
    await vehicleType.save();
    res.status(201).json({message: 'Loại xe mới đã được thêm', vehicleType});
  }
  catch (error) {
    console.error('Lỗi khi thêm loại xe:', error.message);
    res.status(500).send('Lỗi máy chủ');
  } 
}

export const updateVehicleType = async (req, res) => {
  try {
    const { vehicle_type_name, description } = req.body;
    const { id } = req.params;
    let vehicleType = await VehicleType.findById(id);
    if(!vehicleType || vehicleType.is_deleted){
      return  res.status(404).json({message: 'Không tìm thấy loại xe'});
    } 
    // Cập nhật thông tin loại xe
    if (vehicle_type_name) vehicleType.vehicle_type_name = vehicle_type_name;
    if (description) vehicleType.description = description;
    vehicleType.updated_at = Date.now();
    await vehicleType.save();
    res.json({message: 'Cập nhật thông tin loại xe thành công', vehicleType});
  } catch (error) {
    console.error('Lỗi khi cập nhật loại xe:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}
    // Đánh dấu loại xe là đã xóa
export const deleteVehicleType = async (req, res) => {
  try {
    const { id } = req.params;
    let vehicleType = await VehicleType.findById(id);
    if(!vehicleType || vehicleType.is_deleted){
      return  res.status(404).json({message: 'Không tìm thấy loại xe'});
    } 
    vehicleType.is_deleted = true;
    vehicleType.updated_at = Date.now();
    await vehicleType.save();
    res.json({message: 'Xóa loại xe thành công'});
  } catch (error) { 
    console.error('Lỗi khi xóa loại xe:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}
