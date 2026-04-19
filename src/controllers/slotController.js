import Appointment from "../models/Appointment.js";
import Slot from "../models/Slot.js";

// Tạo slot mới
export const addSlot = async (req, res) => {
  try {
    const { start_time, capacity } = req.body;

    if (!start_time) {
      return res.status(400).json({ message: "Vui lòng cung cấp giờ bắt đầu" });
    }

    // Kiểm tra format "HH:mm"
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time)) {
      return res
        .status(400)
        .json({ message: "Giờ không hợp lệ, định dạng HH:mm. VD: 08:00" });
    }

    // Kiểm tra slot giờ đó đã tồn tại chưa
    const existingSlot = await Slot.findOne({ start_time, is_deleted: false });
    if (existingSlot) {
      return res.status(400).json({ message: `Slot ${start_time} đã tồn tại` });
    }

    const slot = new Slot({
      start_time,
      status: "available",
      capacity: capacity || 1,
      is_deleted: false,
    });

    await slot.save();
    res.status(201).json({ message: "Slot mới đã được tạo", slot });
  } catch (error) {
    console.error("Lỗi khi thêm slot", error.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// Cập nhật slot
export const updateSlot = async (req, res) => {
  const { slotId } = req.params;
  const { start_time, status, capacity } = req.body;

  try {
    const slot = await Slot.findById(slotId);
    if (!slot || slot.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy slot" });
    }

    if (start_time) slot.start_time = start_time;
    if (status) slot.status = status;
    if (capacity !== undefined) slot.capacity = capacity;

    await slot.save();
    res.json({ message: "Cập nhật slot thành công", slot });
  } catch (err) {
    console.error("Lỗi khi cập nhật slot:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// Xóa mềm slot
export const softDeleteSlot = async (req, res) => {
  const { slotId } = req.params;

  try {
    const slot = await Slot.findById(slotId);
    if (!slot || slot.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy slot" });
    }
    if (slot.status === "booked") {
      return res
        .status(400)
        .json({ message: "Không thể xóa slot đang có lịch hẹn" });
    }

    slot.is_deleted = true;
    await slot.save();
    res.json({ message: "Slot đã được xóa mềm", slot });
  } catch (err) {
    console.error("Lỗi khi xóa slot:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// Lấy tất cả slot
export const getAllSlots = async (req, res) => {
  try {
    const slots = await Slot.find({ is_deleted: false }).sort({
      start_time: 1,
    });
    res.json(slots);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách slot:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// Lấy slot theo ID kèm lịch hẹn
export const getSlotById = async (req, res) => {
  const { slotId } = req.params;

  try {
    const slot = await Slot.findOne({ _id: slotId, is_deleted: false });
    if (!slot) {
      return res.status(404).json({ message: "Không tìm thấy slot" });
    }

    const appointments = await Appointment.find({
      slot_id: slotId,
      is_deleted: false,
      status: { $in: ["waiting", "in_progress"] },
    })
      .populate("vehicle_id customer_id")
      .lean();

    res.json({ slot, appointments });
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết slot:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// Lấy tất cả slot kèm lịch hẹn theo ngày
export const getAllSlotsWithAppointments = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp ngày. VD: ?date=2026-04-27" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const slots = await Slot.find({ is_deleted: false }).sort({
      start_time: 1,
    });
    const result = [];

    for (const slot of slots) {
      const appointments = await Appointment.find({
        slot_id: slot._id,
        is_deleted: false,
        status: { $in: ["waiting", "in_progress"] },
        appointment_datetime: { $gte: startOfDay, $lte: endOfDay },
      })
        .populate("vehicle_id customer_id")
        .lean();

      result.push({
        slot,
        appointments,
        isBooked: slot.status === "booked",
        currentStatus: slot.status,
      });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi khi lấy tất cả các slot và lịch hẹn:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};
