import Invoice from "../models/Invoice";
import PromotionHeader from "../models/PromotionHeader";
import PromotionLine from "../models/PromotionLine";
import PromotionDetail from "../models/PromotionDetail"

export const getAllPromotions = async (req, res) => {
  try {
    const promotions = await PromotionHeader.find({ is_deleted: false }).sort({
      is_active: -1,
    });

    res.json(promotions);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách chương trình khuyến mãi", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

/**
 * 
 * {
  "promotion_code": "PROMO13",
  "name": "Khuyến mãi 10%",
  "description": "Khuyến mãi cho khách hàng vàng",
  "is_active": true,
  "start_date": "2024-10-01T00:00:00.000Z",
  "end_date": "2024-10-31T23:59:59.000Z"
}
 */

export const addPromotionHeader = async (req, res) => {
  const { promotion_code, name, description, start_date, end_date } = req.body;
  if (start_date >= end_date) {
    return res.status(400).json({
      message: "Ngày kết thúc phải sau ngày bắt đầu",
    });
  }
  if (start_date <= Date.now()) {
    return res.status(400).json({ message: "Ngày kết thúc" });
  }
  if (end_date <= Date.now()) {
    return res.status(400).json({
      message: "Ngày kết thúc phải sau ngày hiện tại",
    });
  }
  let promotionHeader = await PromotionHeader.find({ promotion_code });
  if (promotionHeader.length > 0) {
    return res.status(400).json({
      message: "Mã khuyến mãi đã tồn tại",
    });
  }
  try {
    let existingPromotion = await PromotionHeader.findOne({
      promotion_code,
    });
    if (existingPromotion) {
      return res.status(400).json({
        message: "Khuyến mãi đã tồn tại",
      });
    }
    const promotionHeader = new PromotionHeader({
      promotion_code,
      name,
      description,
      start_date,
      end_date,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    // Lưu vào cơ sở dữ liệu
    await promotionHeader.save();

    res.status(201).json({
      msg: "Chương trình khuyến mãi mới đã được thêm",
      promotionHeader,
    });
  } catch (error) {
    console.error("Lỗi khi thêm chương trình khuyến mãi:", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
};



export const updatePromotionHeader = async (req, res) => {
  const { promotionHeaderId } = req.params;
  const { name, description, is_active, start_date, end_date } = req.body;
  if (
    is_active != null &&
    name == null &&
    description == null &&
    start_date == null &&
    end_date == null
  ) {
    let promotionHeader = await PromotionHeader.findById(promotionHeaderId);
    if (!promotionHeader || promotionHeader.is_deleted) {
      return res
        .status(404)
        .json({ msg: "Không tìm thấy chương trình khuyến mãi" });
    }
    promotionHeader.is_active = is_active;
    promotionHeader.updated_at = Date.now();
    await promotionHeader.save();
    res.status(200).json({
      msg: "Cập nhật trạng thái khuyến mãi thành công",
      promotionHeader,
    });
  }
  if (start_date >= end_date) {
    return res.status(400).json({ msg: "Ngày kết thúc phải sau ngày bắt đầu" });
  }
  if (end_date <= Date.now()) {
    return res
      .status(400)
      .json({ msg: "Ngày kết thúc phải sau ngày hiện tại" });
  }

  let invoice = await Invoice.find({ promotion_header_id: promotionHeaderId });
  if (invoice.length > 0) {
    return res.status(400).json({
      msg: "Chương trình khuyến mãi này đang được sử dụng trong hóa đơn. Không thể cập nhật",
    });
  }
  try {
    let promotionHeader = await PromotionHeader.findById(promotionHeaderId);
    if (!promotionHeader || promotionHeader.is_deleted) {
      return res
        .status(404)
        .json({ msg: "Không tìm thấy chương trình khuyến mãi" });
    }

    if (name) promotionHeader.name = name;
    if (description) promotionHeader.description = description;
    if (is_active != null) promotionHeader.is_active = is_active;
    if (start_date) promotionHeader.start_date = start_date;
    if (end_date) promotionHeader.end_date = end_date;

    promotionHeader.updated_at = Date.now();
    await promotionHeader.save();

    res.json({
      msg: "Cập nhật chương trình khuyến mãi thành công",
      promotionHeader,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật chương trình khuyến mãi:", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const deletePromotionHeader = async (req, res) => {
  try {
    const { promotionHeaderId } = req.params;
    let invoice = await Invoice.find({
      promotion_header_id: promotionHeaderId,
    });
    if (invoice.length > 0) {
      return res.status(400).json({
        message: "Chương trình khuyến mãi này đang được sử dụng trong hóa đơn",
      });
    }
    let priceLine = await PromotionLine.fine({
      promotion_header_id: promotionHeaderId,
      is_deleted: false,
    });
    if (priceLine.length > 0) {
      return res.status(400).json({
        message:
          "Chương trình khuyến mãi này đang được sử dụng trong khuyến mãi",
      });
    }
  } catch (error) {
    console.error("Lỗi khi xóa chương trình khuyến mãi", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const getAllPromotionLine = async (req,res) =>{
   const { promotionHeaderId } = req.params;

   try {
     // Tìm tất cả các dòng chi tiết khuyến mãi của chương trình khuyến mãi không bị xóa
     const promotionLines = await PromotionLine.find({
       promotion_header_id: promotionHeaderId,
       is_deleted: false,
     });

     res.json(promotionLines);
   } catch (err) {
     console.error("Lỗi khi lấy chi tiết khuyến mãi:", err.message);
     res.status(500).send("Lỗi máy chủ");
   } 
}

/**
 * 
 {
  "discount_type": "percentage",
  "discount_value": 10,
  "min_order_value": 100000,
  "start_date": "2024-10-01T00:00:00.000Z",
  "end_date": "2024-10-31T23:59:59.000Z"
}
 */

export const addPromotionLine = async (req, res) => {
  const { discount_type, start_date, end_date, description } = req.body;
  const { promotionHeaderId } = req.params;
  const promotion_header = await PromotionHeader.findById(promotionHeaderId);
  if (!promotion_header) {
    return res
      .status(404)
      .json({ message: "Không tìm thấy chương trình khuyến mãi" });
  }
  if (promotion_header.is_deleted) {
    return res.status(404).json({ msg: "Chương trình khuyến mãi đã bị xóa" });
  }
  if (!promotion_header.is_active) {
    return res.status(400).json({ msg: "Chương trình khuyến mãi đang bị tắt" });
  }
  if (promotion_header.start_date > start_date) {
    return res.status(400).json({
      msg: "Ngày bắt đầu phải sau ngày bắt đầu của chương trình khuyến mãi",
    });
  }
  if (promotion_header.end_date < end_date) {
    return res.status(400).json({
      msg: "Ngày kết thúc phải trước ngày kết thúc của chương trình khuyến mãi",
    });
  }
  try {
    // Tạo mới dòng chi tiết khuyến mãi
    const promotionLine = new PromotionLine({
      promotion_header_id: promotionHeaderId,
      discount_type,
      description,
      start_date,
      end_date,
      is_deleted: false,
      updated_at: Date.now(),
    });

    // Lưu vào cơ sở dữ liệu
    await promotionLine.save();

    res.status(201).json({
      msg: "Chi tiết khuyến mãi đã được thêm vào chương trình khuyến mãi",
      promotionLine,
    });
  } catch (error) {
    console.error("Lỗi khi thêm chi tiết khuyến mãi:", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const updatePromotionLine = async (req, res) => {
  const { promotionLineId } = req.params;
  const { discount_type, description, is_active, start_date, end_date } =
    req.body;
  let promotionLine = await PromotionLine.findById(promotionLineId);
  if (
    is_active != null &&
    discount_type == null &&
    description == null &&
    start_date == null &&
    end_date == null
  ) {
    promotionLine.is_active = is_active;
    promotionLine.updated_at = Date.now();
    await promotionLine.save();
    res.json({
      msg: "Cập nhật trạng thái khuyến mãi thành công",
      promotionLine,
    });
  }
  try {
    let promotionLine = await PromotionLine.findById(promotionLineId);
    if (!promotionLine || promotionLine.is_deleted) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy dòng khuyến mãi " });
    }
    if (discount_type) promotionLine.discount_type = discount_type;
    if (description) promotionLine.description = description;
    if (is_active != null) promotionLine.is_active = is_active;
    if (start_date) promotionLine.start_date = start_date;
    if (end_date) promotionLine.end_date = end_date;

    promotionLine.updated_at = Date.now();
    await promotionLine.save();

    res.json({ msg: "Cập nhật khuyến mãi thành công", promotionLine });
  } catch (error) {
    console.error("Lỗi khi cập nhật dòng khuyến mãi:", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const deletePromotionLine = async (req, res) => {
  const { promotionLineId } = req.params;
  let promotionDetail = await PromotionDetail.find({
    promotion_line_id: promotionLineId,
    is_deleted: false,
  });
  if (promotionDetail.length > 0) {
    return res.status(400).json({
      msg: "Dòng khuyến mãi này đang được sử dụng trong chi tiết khuyến mãi",
    });
  }
  try {
    let promotionLine = await PromotionLine.findById(promotionLineId);
    if (!promotionLine || promotionLine.is_deleted) {
      return res.status(404).json({ msg: "Không tìm thấy dòng khuyến mãi" });
    }

    promotionLine.is_deleted = true;
    promotionLine.updated_at = Date.now();

    await promotionLine.save();
    res.json({ msg: "Dòng khuyến mãi đã được xóa", promotionLine });
  } catch (err) {
    console.error("Lỗi khi xóa dòng khuyến mãi:", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const getPromotionDetail = async (req,res) =>{
   const { promotionLineId } = req.params;

   try {
     const promotionDetails = await PromotionDetail.find({
       promotion_line_id: promotionLineId,
       is_deleted: false,
     }).populate("applicable_rank_id service_id");

     res.json(promotionDetails);
   } catch (err) {
     console.error("Lỗi khi lấy chi tiết dòng khuyến mãi:", err.message);
     res.status(500).send("Lỗi máy chủ");
   }
}

/**
 * 
 {
    "promotionId": "671c64a196e0e27538c25786",
    "vehicle_type_id": "",
    "service_id": "",
    "applicable_rank_id": "",
    "discount_value": "1000",
    "min_order_value": "5000"
}
 */

export const addPromotionDetail = async (req,res) =>{
  const {promotionLineId} = req.params
  const {applicable_rank_id, discount_value, min_order_value} = req.body
  try {
    if(discount_value < 0) {
      return res.status(400).json({
        message:"Giá trị giảm giá không hợp lệ"
      })
    }
     if (min_order_value < 0) {
       return res
         .status(400)
         .json({ msg: "Giá trị đơn hàng tối thiểu không hợp lệ" });
     }
     if (!applicable_rank_id) {
       const promotionDetail = new PromotionDetail({
         promotion_line_id: promotionLineId,
         discount_value,
         min_order_value,
       });
       await promotionDetail.save();
       res
         .status(201)
         .json({ msg: "Chi tiết khuyến mãi đã được thêm", promotionDetail });
     } else{
       const promotionDetail = new PromotionDetail({
         promotion_line_id: promotionLineId,
         applicable_rank_id,
         discount_value,
         min_order_value,
       });
       await promotionDetail.save();
       res
         .status(201)
         .json({ msg: "Chi tiết khuyến mãi đã được thêm", promotionDetail });
     }
  } catch (error) {
    console.log("Lỗi khi thêm chi tiết khuyến mãi",error.message)
    res.status(500).send("Lỗi máy chủ")
  }
}

export const updatePromotionDetail = async (req,res) =>{
  const { promotionDetailId } = req.params;
  const {
    applicable_rank_id,
    service_id,
    discount_value,
    min_order_value,
    is_active,
  } = req.body;
  if (
    is_active != null &&
    applicable_rank_id == null &&
    service_id == null &&
    discount_value == null &&
    min_order_value == null
  ) {
    let promotionDetail = await PromotionDetail.findById(promotionDetailId);
    if (!promotionDetail || promotionDetail.is_deleted) {
      return res
        .status(404)
        .json({ msg: "Không tìm thấy chi tiết khuyến mãi" });
    }
    promotionDetail.is_active = is_active;
    promotionDetail.updated_at = Date.now();
    await promotionDetail.save();
    res.json({
      msg: "Cập nhật trạng thái khuyến mãi thành công",
      promotionDetail,
    });
  }
  try {
    // Tìm chi tiết khuyến mãi theo ID
    let promotionDetail = await PromotionDetail.findById(promotionDetailId);
    if (!promotionDetail || promotionDetail.is_deleted) {
      return res
        .status(404)
        .json({ msg: "Không tìm thấy chi tiết khuyến mãi" });
    }
    let promotionLine = await PromotionLine.findById(
      promotionDetail.promotion_line_id
    );
    let promotionHeader = await PromotionHeader.findById(
      promotionLine.promotion_header_id
    );
    let invoice = await Invoice.find({
      promotion_header_id: promotionHeader._id,
    });
    if (invoice.length > 0) {
      return res
        .status(400)
        .json({ msg: "Khuyến mãi này đang được sử dụng trong hóa đơn" });
    }
    // Cập nhật thông tin nếu có
    if (applicable_rank_id)
      promotionDetail.applicable_rank_id = applicable_rank_id;
    if (service_id) promotionDetail.service_id = service_id;
    if (discount_value) promotionDetail.discount_value = discount_value;
    if (min_order_value) promotionDetail.min_order_value = min_order_value;
    if (is_active != null) promotionDetail.is_active = is_active;

    promotionDetail.updated_at = Date.now();

    // Lưu lại thay đổi
    await promotionDetail.save();

    res.json({
      msg: "Cập nhật chi tiết khuyến mãi thành công",
      promotionDetail,
    });
  } catch (err) {
    console.error("Lỗi khi cập nhật chi tiết khuyến mãi:", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
}

export const deletePromotionDetail = async(req,res) =>{
   const { promotionDetailId } = req.params;

   try {
     // Tìm chi tiết khuyến mãi theo ID
     let promotionDetail = await PromotionDetail.findById(promotionDetailId);
     if (!promotionDetail || promotionDetail.is_deleted) {
       return res
         .status(404)
         .json({ msg: "Không tìm thấy chi tiết khuyến mãi" });
     }
     let promotionLine = await PromotionLine.findById(
       promotionDetail.promotion_line_id
     );
     if (promotionLine.is_deleted) {
       return res.status(404).json({ msg: "Dòng khuyến mãi đã bị xóa" });
     }
     let promotionHeader = await PromotionHeader.findById(
       promotionLine.promotion_header_id
     );
     let invoice = await Invoice.find({
       promotion_header_id: promotionHeader._id,
     });
     if (invoice.length > 0) {
       return res
         .status(400)
         .json({
           msg: "Chương trình khuyến mãi này đang được sử dụng trong hóa đơn",
         });
     }
     // Đánh dấu chi tiết khuyến mãi là đã xóa
     promotionDetail.is_deleted = true;
     promotionDetail.updated_at = Date.now();

     // Lưu lại thay đổi
     await promotionDetail.save();

     res.json({ msg: "Chi tiết khuyến mãi đã được xóa mềm", promotionDetail });
   } catch (err) {
     console.error("Lỗi khi xóa chi tiết khuyến mãi:", err.message);
     res.status(500).send("Lỗi máy chủ");
   }
}
