import Customer from "../models/Customer.js ";
import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";  

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ is_deleted: false })
      .populate("customer_rank_id")
      .lean();

    res.json(customers);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách Customer:", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};


export const addCustomer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, username, address, phone_number } = req.body;

    // 1️⃣ kiểm tra email tồn tại
    const existedUser = await User.findOne({ email });

    if (existedUser) {
      return res.status(400).json({
        message: "Email đã tồn tại",
      });
    }

    // 2️⃣ tạo password mặc định
    const hashedPassword = await bcrypt.hash("123456", 10);

    // 3️⃣ tạo user login
    const user = await User.create(
      [
        {
          username,
          email,
          hashedPassword,
          role: "customer",
          is_active: true,
          must_change_password: true,
        },
      ],
      { session }
    );

    // 4️⃣ tạo customer
    const customer = await Customer.create(
      [
        {
          user_id: user[0]._id,
          email,
          name: username,
          address,
          phone_number,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Thêm khách hàng thành công",
      data: customer[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Lỗi khi thêm Customer:", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};


export const updateCustomer = async (req, res) => {
  try {
    const { email, name, address, phone_number } = req.body;

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Không tìm thấy khách hàng",
      });
    }

    // update customer
    customer.email = email;
    customer.name = name;
    customer.address = address;
    customer.phone_number = phone_number;

    await customer.save();

    // update user login
    await User.findByIdAndUpdate(customer.user_id, {
      email,
      username: name,
    });

    res.json({
      message: "Cập nhật khách hàng thành công",
      data: customer,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật Customer:", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        message: "Không tìm thấy khách hàng",
      });
    }

    customer.is_deleted = true;
    await customer.save();

    // khóa user login
    await User.findByIdAndUpdate(customer.user_id, {
      is_deleted: true,
      is_active: false,
    });

    res.json({
      message: "Xóa khách hàng thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa Customer:", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      is_deleted: false,
    })
      .populate("customer_rank_id")
      .lean();

    if (!customer) {
      return res.status(404).json({
        message: "Không tìm thấy khách hàng",
      });
    }

    const vehicles = await Vehicle.find({
      customer_id: customer._id,
      is_deleted: false,
    })
      .populate("vehicle_type_id")
      .lean();

    res.json({ customer, vehicles });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin khách hàng:", error.message);
    res.status(500).send("Lỗi máy chủ");
  }
};
