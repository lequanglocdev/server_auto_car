import Customer from "../models/Customer.js ";
import Vehicle from "../models/Vehicle.js";

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ is_deleted: false })
      .populate('customer_rank_id')
      .lean();
    res.json(customers);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách Customer:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}

export const addCustomer  = async (req, res) => {
  try {
    const  { email, username, address, phone_number } = req.body;
    const newCustomer = new Customer({
      user_id: req.user._id,
      email,
      username,
      address,
      phone_number,
    });
    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Lỗi khi thêm Customer:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}

export const updateCustomer = async (req, res) => {
  try {
    const { email, username, address, phone_number } = req.body;
    let customer = await Customer.findById(req.params.id);
    if(!customer){
      return  res.status(404).json({message: 'Không tìm thấy khách hàng'});
    }
    await customer.updateOne({ email, username, address, phone_number });
    res.json({message: 'Cập nhật khách hàng thành công'});
  } catch (error) {
    console.error('Lỗi khi cập nhật Customer:', error.message);
    res.status(500).send('Lỗi máy chủ');  
  }
}

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }
    await customer.updateOne({ is_deleted: true });
    res.json({message: 'Xóa khách hàng thành công'});
  } catch (error) {
    console.error('Lỗi khi xóa Customer:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}

export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, is_deleted: false })
      .populate('customer_rank_id')
      .lean();
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }

    // Tìm xe của khách hàng
    const vehicles = await Vehicle.find({ customer_id: customer._id, is_deleted: false }).populate('vehicle_type_id').lean();

    res.json({customer, vehicles});

  } catch (error) {
    console.error('Lỗi khi lấy thông tin khách hàng:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}

