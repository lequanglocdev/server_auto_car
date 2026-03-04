import CustomerRank from "../models/CustomerRank.js"

export const getAllCustomerRank = async (req,res) =>{
    try {
      const customerRanks = await CustomerRank.find({ is_deleted: false });
      res.json(customerRanks);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách hạng khách hàng:", err.message);
      res.status(500).send("Lỗi máy chủ");
    }
}

export const getCustomerRankById = async(req,res) =>{
  const { rankId } = req.params;

  try {
    const customerRank = await CustomerRank.findOne({
      _id: rankId,
      is_deleted: false,
    });
    if (!customerRank) {
      return res.status(404).json({ msg: "Không tìm thấy hạng khách hàng" });
    }

    res.json(customerRank);
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết hạng khách hàng:", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
}

export const addCustomerRank = async (req, res) => {
  const { rank_name, discount_rate, min_spending } = req.body;
  try {
    // Kiểm tra rank_name đã tồn tại chưa
    let existingRank = await CustomerRank.findOne({ rank_name });
    if (existingRank) {
      return res.status(400).json({ msg: "Tên hạng khách hàng đã tồn tại" });
    }

    // Tạo mới hạng khách hàng
    const customerRank = new CustomerRank({
      rank_name,
      discount_rate,
      min_spending,
      description,
      is_deleted: false,
    });

    await customerRank.save();
    res
      .status(201)
      .json({ msg: "Hạng khách hàng mới đã được thêm", customerRank });
  } catch (err) {
    console.error("Lỗi khi thêm hạng khách hàng:", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const updateCustomerRank = async (req, res) => {
  const { rank_name, discount_rate, min_spending, description } = req.body;
  const { rankId } = req.params;

  try {
    let customerRank = await CustomerRank.findById(rankId);
    if (!customerRank || customerRank.is_deleted) {
      return res.status(404).json({ msg: "Không tìm thấy hạng khách hàng" });
    }

    // Cập nhật thông tin nếu có
    if (rank_name) customerRank.rank_name = rank_name;
    if (discount_rate !== undefined) customerRank.discount_rate = discount_rate;
    if (min_spending !== undefined) customerRank.min_spending = min_spending;
    if (description) customerRank.description = description;

    customerRank.updated_at = Date.now();

    await customerRank.save();
    res.json({ msg: "Cập nhật hạng khách hàng thành công", customerRank });
  } catch (err) {
    console.error("Lỗi khi cập nhật hạng khách hàng:", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const deleteCustomerRank = async (req, res) => {
  const { rankId } = req.params;

  try {
    let customerRank = await CustomerRank.findById(rankId);
    if (!customerRank || customerRank.is_deleted) {
      return res.status(404).json({ msg: "Không tìm thấy hạng khách hàng" });
    }

    customerRank.is_deleted = true;
    customerRank.updated_at = Date.now();

    await customerRank.save();
    res.json({ msg: "Hạng khách hàng đã được xóa mềm", customerRank });
  } catch (err) {
    console.error("Lỗi khi xóa hạng khách hàng:", err.message);
    res.status(500).send("Lỗi máy chủ");
  }
};
