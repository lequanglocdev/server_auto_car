import PriceHeader from "../models/PriceHeader.js";
import PriceLine from "../models/PriceLine.js";

/**
 * 
{
  "price_list_name": "Bảng giá tháng 10-11",
  "start_date": "2024-10-01T00:00:00.000Z",
  "end_date": "2024-11-30T23:59:59.000Z"
}

 */

export const addPriceHeader = async (req, res) => {
  const { price_list_name, start_date, end_date } = req.body;
  try {
    if (start_date >= end_date) {
      return res
        .status(400)
        .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });
    }
    if (start_date <= Date.now()) {
      return res
        .status(400)
        .json({ message: "Ngày bắt đầu phải sau ngày hiện tại" });
    }
    if (end_date < Date.now()) {
      return res.status(400).json({ message });
    }
    const priceHeader = new PriceHeader({
      price_list_name,
      start_date,
      end_date,
      is_active: true,
      is_deleted: false,
      updated_at: Date.now(),
    });
    await priceHeader.save();
    res.status(201).json({ message: "Bảng giá mới đã được thêm", priceHeader });
  } catch (error) {
    console.error("Lỗi khi thêm bảng giá", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

/**
 * {
    "price_list_name": "Bảng giá của Khánh",
    "start_date": "2024-11-01T00:00:00.000Z",
    "end_date": "2024-11-15T00:00:00.000Z",
    "is_active" : true
}
 */

export const updatePriceHeader = async (req, res) => {
  const { priceHeaderId } = req.params;
  const { price_list_name, start_date, end_date, is_active } = req.body;
  if (
    is_active != null &&
    (price_list_name == null) & (start_date == null) &&
    end_date == null
  ) {
    let priceHeader = await PriceHeader.findById(priceHeaderId);
    if (!priceHeader || priceHeader.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy bảng giá" });
    }
    priceHeader.is_active = is_active;
    priceHeader.updated_at = Date.now();
    await priceHeader.save();
    return res
      .status(200)
      .json({ message: "Bảng giá được cập nhật", priceHeader });
  }
  try {
    let priceHeader = await PriceHeader.findById(priceHeaderId);
    if (!priceHeader || priceHeader.is_deleted) {
      return res.status(404).json({ message: "Không tìm thất bảng giá" });
    }
    if (price_list_name) priceHeader.price_list_name = price_list_name;
    if (start_date) priceHeader.start_date = start_date;
    if (end_date) priceHeader.end_date = end_date;
    if (is_active != null) priceHeader.is_active = is_active;
    priceHeader.updated_at = Date.now();
    await priceHeader.save();
    res.json({ message: "Bảng giá đã được cập nhật", priceHeader });
  } catch (error) {
    console.error("Lỗi khi cập nhật bảng giá", error.message);
    return res.status(500).send("Lỗi máy chủ");
  }
};

export const deletePriceHeader = async (req, res) => {
  try {
    const { priceHeaderId } = req.params;
    const priceHeader = await PriceHeader.findById(priceHeaderId, {
      is_deleted: false,
    });
    if (!priceHeader || priceHeader.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy bảng giá" });
    }
    let priceLine = await PriceLine.find({
      price_header_id: priceHeaderId,
      is_deleted: false,
    });
    if (priceLine.length > 0) {
      return res
        .status(400)
        .json({ message: "Bảng giá đã có giá cho dich vu. Không thể xóa" });
    }
    if (
      priceHeader.start_date <= Date.now() &&
      priceHeader.end_date >= Date.now()
    ) {
      priceHeader.is_active = false;
      priceHeader.updated_at = Date.now();
      priceHeader.end_date = Date.now();
      priceHeader.is_deleted = true;
      await priceHeader.save();
    } else {
      priceHeader.is_active = false;
      priceHeader.is_deleted = true;
      priceHeader.updated_at = Date.now();

      await priceHeader.save();
    }
    res.json({ message: "Bảng giá đã được xóa", priceHeader });
  } catch (error) {
    console.log("Lỗi khi xóa bảng giá", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

/**
  {
  "service_id": "66f956cb05c4ebf9465398b5",  
  "vehicle_type_id": "66f9395f558b2f9732f6cfdc", 
  "price": 200000
}

 */

export const addPriceLine = async (req, res) => {
  const { service_id, vehicle_type_id, price } = req.body;
  const { priceHeaderId } = req.params;

  if (!service_id || !vehicle_type_id) {
    return res
      .status(400)
      .json({ message: "Dịch vụ và loại xe không được để trống" });
  }
  if (!price) {
    return res.status(400).json({
      message: "Giá không được để trống",
    });
  }
  if (price <= 0) {
    return res.status(400).json({ message: "Giá không hợp lệ" });
  }
  const priceHeader = await PriceHeader.findById(priceHeaderId);
  if (!priceHeader || priceHeader.is_deleted) {
    return res.status(400).json({ message: "Không tìm thấy bảng giá" });
  }
  if (priceHeader.end_date <= Date.now()) {
    return res.status(400).json({ message: "Bảng giá đã hết hạn" });
  }
  const priceLine = await PriceLine.findOne({
    service_id: service_id,
    vehicle_type_id: vehicle_type_id,
    is_active: true,
    is_deleted: false,
  });
  if (priceLine) {
    return res
      .status(400)
      .json({ message: "Giá của dịch vụ cho loại xe trên đã tồn tại" });
  }
  try {
    const newLine = new PriceLine({
      price_header_id: priceHeaderId,
      service_id,
      vehicle_type_id,
      price,
      is_deleted: false,
      updated_at: Date.now(),
    });
    await newLine.save();
    const populatedLine = await PriceLine.findById(newLine._id)
      .populate("service_id")
      .populate("vehicle_type_id")
      .sort({ created_at: -1 });

    return res.status(201).json({
      message: "Chi tiết giá đã được thêm vào bảng giá",
      priceLine: populatedLine,
    });
  } catch (error) {
    console.error("Lỗi khi thêm chi tiết giá", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

/**
  //   const { priceLineId } = req.params;
//   const { service_id, vehicle_type_id, price, is_active } = req.body;
{
    "service_id": "6707f2bf528f96675a9ace9a",
    "vehicle_type_id": "67109ee0a17d7da4c4e22107",
    "price": "0",
    "is_active" : true
}
 */

export const updatePriceLine = async (req, res) => {
  const { priceLineId } = req.params;
  const { service_id, vehicle_type_id, price, is_active } = req.body;
  if (
    is_active != null &&
    service_id == null &&
    vehicle_type_id == null &&
    price == null
  ) {
    let priceLine = await PriceLine.findById(priceLineId);
    if (!priceLine || priceLine.is_deleted) {
      return res.status(404).json({ msg: "Không tìm thấy chi tiết giá" });
    }
    let price = await PriceLine.findOne({
      service_id: priceLine.service_id,
      vehicle_type_id: priceLine.vehicle_type_id,
      is_active: true,
      is_deleted: false,
    });
    if (price) {
      return res
        .status(400)
        .json({ msg: "Giá của dịch vụ cho loại xe trên đã tồn tại" });
    }
    priceLine.is_active = is_active;
    priceLine.updated_at = Date.now();
    await priceLine.save();
    return res
      .status(200)
      .json({ msg: "Chi tiết giá đã được cập nhật", priceLine });
  }

  try {
    let appointmentService = await AppointmentService.find({
      price_line_id: priceLineId,
    });
    if (appointmentService) {
      return res
        .status(400)
        .json({ msg: "Không thể cập nhật giá đã được sử dụng trong lịch hẹn" });
    }
    let priceLine = await PriceLine.findById(priceLineId);
    if (!priceLine || priceLine.is_deleted) {
      return res.status(404).json({ msg: "Không tìm thấy chi tiết giá" });
    }
    if (price <= 0) {
      return res.status(400).json({ msg: "Giá không hợp lệ" });
    }
    if (service_id) priceLine.service_id = service_id;
    if (vehicle_type_id) priceLine.vehicle_type_id = vehicle_type_id;
    if (price) priceLine.price = price;
    if (is_active != null) priceLine.is_active = is_active;

    priceLine.updated_at = Date.now();
    await priceLine.save();
    res.json({ msg: "Chi tiết giá đã được cập nhật", priceLine });
  } catch (err) {
    console.error("Lỗi khi cập nhật chi tiết giá:", err.message);
    res.status(500).send("Lỗi máy chủ trong cập nhật chi tiết giá");
  }
};

export const deletePriceLine = async (req, res) => {
  try {
    const { priceLineId } = req.params;
    let priceLine = await PriceLine.findById(priceLineId);
    if (!priceLine || priceLine.is_deleted) {
      return res.status(404).json({
        message: "Không tìm thấy chi tiết giá",
      });
    }
    priceLine.is_deleted = true;
    priceLine.updated_at = Date.now();
    await priceLine.save();
    res.json({ message: "Chi tiết giá đã được xóa", priceLine });
  } catch (error) {
    console.error("Lỗi khi xóa chi tiết giá", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const getAllPriceHeader = async (req, res) => {
  try {
    const priceHeader = await PriceHeader.find({
      is_deleted: false,
    }).sort({ is_active: -1 });
    res.json(priceHeader);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách ");
    return res.status(500).send("Lỗi máy chủ");
  }
};

export const getPriceLineByHeader = async (req, res) => {
  const { priceHeaderId } = req.params;
  try {
    const priceLine = await PriceLine.find({
      price_header_id: priceHeaderId,
      is_deleted: false,
    }).populate("service_id vehicle_type_id");
    res.json(priceLine);
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết giá");
    res.status(500).send("Lỗi máy chủ");
  }
};
