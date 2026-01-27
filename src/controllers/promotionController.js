import Invoice from "../models/Invoice";
import PromotionHeader from "../models/PromotionHeader"
import PromotionLine from "../models/PromotionLine";

export const getAllPromotions = async(req,res) =>{
  try {
     const promotions = await PromotionHeader.find({ is_deleted: false }).sort({
       is_active: -1,
     });

     res.json(promotions);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách chương trình khuyến mãi",err.message)
    res.status(500).send("Lỗi máy chủ")

  }
}

export const addPromotionHeader = async(req,res) =>{
  const {promotion_code, name, description, start_date, end_date } = req.body
  if(start_date >= end_date){
    return res.status(400).json({
      message: "Ngày kết thúc phải sau ngày bắt đầu"
    })
  }
  if(start_date <= Date.now()){
    return res.status(400).json({message:"Ngày kết thúc"})
  }
  if(end_date <= Date.now()){
    return res.status(400).json({
      message: "Ngày kết thúc phải sau ngày hiện tại"
    })
  }
  let promotionHeader = await PromotionHeader.find({promotion_code})
  if(promotionHeader.length > 0){
    return res.status(400).json({
      message: "Mã khuyến mãi đã tồn tại"
    })
  }
  try {
    let existingPromotion = await PromotionHeader.findOne({
      promotion_code
    })
    if(existingPromotion){
      return res.status(400).json({
        message: "Khuyến mãi đã tồn tại"
      })
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

     res
       .status(201)
       .json({
         msg: "Chương trình khuyến mãi mới đã được thêm",
         promotionHeader,
       });
  } catch (error) {
     console.error("Lỗi khi thêm chương trình khuyến mãi:", err.message);
     res.status(500).send("Lỗi máy chủ");
  }

}

export const updatePromotionHeader = async (req,res) =>{
  const {promotionHeaderId} = req.params
  const {name, description,is_active,start_date,end_date} = req.body
  if(is_active != null && name == null && description == null && start_date == null && end_date == null){
        let promotionHeader = await PromotionHeader.findById(promotionHeaderId);
        if (!promotionHeader || promotionHeader.is_deleted) {
            return res.status(404).json({ msg: 'Không tìm thấy chương trình khuyến mãi' });
        }
        promotionHeader.is_active = is_active;
        promotionHeader.updated_at = Date.now();
        await promotionHeader.save();
        res.status(200).json({ msg: 'Cập nhật trạng thái khuyến mãi thành công', promotionHeader });
    }
    if (start_date >= end_date) {
        return res.status(400).json({ msg: 'Ngày kết thúc phải sau ngày bắt đầu' });
    }
    if (end_date <= Date.now()) {
        return res.status(400).json({ msg: 'Ngày kết thúc phải sau ngày hiện tại' });
    }
    

    let invoice = await Invoice.find({ promotion_header_id: promotionHeaderId });
    if (invoice.length > 0) {
        return res.status(400).json({ msg: 'Chương trình khuyến mãi này đang được sử dụng trong hóa đơn. Không thể cập nhật' });
    }
    try {
      let promotionHeader = await PromotionHeader.findById(promotionHeaderId);
        if (!promotionHeader || promotionHeader.is_deleted) {
            return res.status(404).json({ msg: 'Không tìm thấy chương trình khuyến mãi' });
        }

        if (name) promotionHeader.name = name;
        if (description) promotionHeader.description = description;
        if (is_active != null) promotionHeader.is_active = is_active;
        if (start_date) promotionHeader.start_date = start_date;
        if (end_date) promotionHeader.end_date = end_date;

        promotionHeader.updated_at = Date.now();
        await promotionHeader.save();

        res.json({ msg: 'Cập nhật chương trình khuyến mãi thành công', promotionHeader });
    } catch (error) {
       console.error('Lỗi khi cập nhật chương trình khuyến mãi:', err.message);
        res.status(500).send('Lỗi máy chủ');
    }

}

export const deletePromotionHeader = async(req,res) =>{
  try {
    const {promotionHeaderId} = req.params
    let invoice = await Invoice.find({promotion_header_id: promotionHeaderId})
    if(invoice.length > 0){
      return res.status(400).json({message:"Chương trình khuyến mãi này đang được sử dụng trong hóa đơn"})
    }
    let priceLine = await PromotionLine.fine({
      promotion_header_id: promotionHeaderId, is_deleted: false
    })
    if(priceLine.length > 0){
      return res.status(400).json({message:"Chương trình khuyến mãi này đang được sử dụng trong khuyến mãi"})
    }
  } catch (error) {
    console.error("Lỗi khi xóa chương trình khuyến mãi",error.message)
    res.status(500).send("Lỗi máy chủ")
  }
}
