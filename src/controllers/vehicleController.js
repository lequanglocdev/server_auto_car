import Customer from "../models/Customer.js";
import Vehicle from "../models/Vehicle.js";

/*

{
  "vehicle_type_id": "6708a9145e2f93d88c41195e",
  "license_plate": "ABCD123345",
  "manufacturer": "Toyota",
  "model": "Corolla",
  "year": 2021,
  "color": "White"
}
*/
export const addVehicle = async (req, res) => {
  try {
    const { vehicle_type_id, license_plate, manufacturer, model, year, color } =
      req.body;
    // kiem tra khach hang ton tai
    const customer = await Customer.findById(req.params.customerId);
    if (!customer || customer.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    }
    // kiem tra bien so xe da ton tai
    const existingVehicle = await Vehicle.findOne({ license_plate });
    if (existingVehicle) {
      return res.status(400).json({ message: "Biển số xe đã tồn tại" });
    }
    // tao xe mới
    const vehicle = new Vehicle({
      vehicle_type_id,
      license_plate,
      manufacturer,
      model,
      year,
      color,
      customer_id: customer._id,
    });

    await vehicle.save();
    await vehicle.populate("vehicle_type_id");
    res.status(201).json({ message: "Xe mới đã được thêm", vehicle });
  } catch (error) {
    console.error("Lỗi khi thêm xe:", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const { vehicle_type_id, license_plate, manufacturer, model, year, color } =
      req.body;
    let vehicle = await Vehicle.findById(req.params.vehicleId);
    if (
      !vehicle ||
      vehicle.customer_id.toString() !== req.params.customerId ||
      vehicle.is_deleted
    ) {
      return res.status(404).json({ message: "Không tìm thấy xe" });
    }
    // Cập nhật thông tin xe
    if (vehicle_type_id) vehicle.vehicle_type_id = vehicle_type_id;
    if (license_plate) vehicle.license_plate = license_plate;
    if (manufacturer) vehicle.manufacturer = manufacturer;
    if (model) vehicle.model = model;
    if (year) vehicle.year = year;
    if (color) vehicle.color = color;
    vehicle.updated_at = Date.now();
    await vehicle.save();
    await vehicle.populate("vehicle_type_id");
    res.json({ message: "Cập nhật xe thành công", vehicle });
  } catch (error) {
    console.error("Lỗi khi cập nhật xe:", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const { vehicleId, customerId } = req.params;
    let vehicle = await Vehicle.findOne({
      _id: vehicleId,
      customer_id: customerId,
      is_deleted: false,
    });
    if (!vehicle) {
      return res.status(404).json({ message: "Không tìm thấy xe" });
    }
    vehicle.is_deleted = true;
    vehicle.updated_at = Date.now();
    await vehicle.save();
    res.json({ message: "Xóa xe thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa xe:", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};
