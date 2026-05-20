import PayOS from "@payos/node";
import Invoice from "../models/Invoice.js";
import InvoiceDetail from "../models/InvoiceDetail.js";
import AppointmentService from "../models/AppointmentService.js";
import PriceLine from "../models/PriceLine.js";
import Appointment from "../models/Appointment.js";
import Employee from "../models/Employee.js";
import Customer from "../models/Customer.js";
import PromotionLine from "../models/PromotionLine.js";
import PromotionDetail from "../models/PromotionDetail.js";
import Promotion from "../models/Promotion.js";
import Payment from "../models/Payment.js";

const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

// ==================== TẠO HÓA ĐƠN ====================
export const generateInvoice = async (req, res) => {
  const { appointmentId } = req.params;
  const employeeId = req.user.id; // lấy từ token

  try {
    // Kiểm tra lịch hẹn
    const appointment = await Appointment.findById(appointmentId)
      .populate("vehicle_id customer_id")
      .lean();
    if (!appointment || appointment.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy lịch hẹn" });
    }
    if (appointment.status !== "completed") {
      return res.status(400).json({ message: "Lịch hẹn chưa hoàn thành" });
    }

    // Kiểm tra hóa đơn đã tạo chưa
    const invoiceExist = await Invoice.findOne({
      appointment_id: appointmentId,
      is_deleted: false,
    });
    if (invoiceExist) {
      return res.status(400).json({ message: "Hóa đơn đã được tạo" });
    }

    // Kiểm tra nhân viên
    const employee = await Employee.findById(employeeId);
    if (!employee || employee.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    }

    // Lấy dịch vụ trong lịch hẹn
    const appointmentServices = await AppointmentService.find({
      appointment_id: appointmentId,
      is_deleted: false,
    })
      .populate("price_line_id")
      .lean();

    if (appointmentServices.length === 0) {
      return res
        .status(400)
        .json({ message: "Không có dịch vụ nào trong lịch hẹn" });
    }

    // Tính tổng tiền
    let totalAmount = 0;
    const invoiceDetails = [];

    for (let appService of appointmentServices) {
      const priceLine = await PriceLine.findById(
        appService.price_line_id._id
      ).populate("service_id");

      if (!priceLine) {
        return res.status(400).json({ message: "Không tìm thấy bảng giá" });
      }
      totalAmount += priceLine.price;
      invoiceDetails.push({
        service_id: priceLine.service_id._id,
        price: priceLine.price,
        quantity: 1,
      });
    }

    // Áp dụng khuyến mãi tự động
    let fixedDiscount = 0;
    let percentageDiscount = 0;
    const addedPromotionHeaders = new Map();
    const promotionHeaderIds = [];

    const activePromotions = await PromotionLine.find({
      is_active: true,
      is_deleted: false,
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date() },
    }).populate({
      path: "promotion_header_id",
      match: {
        is_active: true,
        is_deleted: false,
        start_date: { $lte: new Date() },
        end_date: { $gte: new Date() },
      },
    });

    for (let promotion of activePromotions) {
      // Bỏ qua nếu header không match
      if (!promotion.promotion_header_id) continue;

      const promotionHeaderId = promotion.promotion_header_id._id.toString();
      const promotionDetails = await PromotionDetail.find({
        promotion_line_id: promotion._id,
        is_deleted: false,
      });

      if (promotion.discount_type == 2) {
        // Giảm giá cố định
        const validDetails = promotionDetails
          .filter((d) => d.min_order_value <= totalAmount)
          .sort((a, b) => b.discount_value - a.discount_value);

        if (validDetails.length > 0) {
          const best = validDetails[0];
          if (addedPromotionHeaders.has(promotionHeaderId)) {
            const existing = addedPromotionHeaders.get(promotionHeaderId);
            if (best.min_order_value > existing.min_order_value) {
              fixedDiscount =
                fixedDiscount - existing.discount_value + best.discount_value;
              const idx = promotionHeaderIds.indexOf(
                existing.promotion_line_id
              );
              promotionHeaderIds[idx] = promotion._id;
              addedPromotionHeaders.set(promotionHeaderId, {
                promotion_line_id: promotion._id,
                discount_value: best.discount_value,
                min_order_value: best.min_order_value,
              });
            }
          } else {
            fixedDiscount += best.discount_value;
            promotionHeaderIds.push(promotion._id);
            addedPromotionHeaders.set(promotionHeaderId, {
              promotion_line_id: promotion._id,
              discount_value: best.discount_value,
              min_order_value: best.min_order_value,
            });
          }
        }
      } else if (promotion.discount_type == 1) {
        // Giảm giá theo phần trăm
        const validDetails = promotionDetails.sort(
          (a, b) => b.discount_value - a.discount_value
        );

        if (validDetails.length > 0) {
          const best = validDetails[0];
          const calculatedDiscount = totalAmount * (best.discount_value / 100);

          if (addedPromotionHeaders.has(promotionHeaderId)) {
            const existing = addedPromotionHeaders.get(promotionHeaderId);
            if (best.discount_value > existing.discount_value) {
              percentageDiscount =
                percentageDiscount -
                totalAmount * (existing.discount_value / 100) +
                calculatedDiscount;
              const idx = promotionHeaderIds.indexOf(
                existing.promotion_line_id
              );
              promotionHeaderIds[idx] = promotion._id;
              addedPromotionHeaders.set(promotionHeaderId, {
                promotion_line_id: promotion._id,
                discount_value: best.discount_value,
                min_order_value: best.min_order_value || 0,
              });
            }
          } else {
            percentageDiscount += calculatedDiscount;
            promotionHeaderIds.push(promotion._id);
            addedPromotionHeaders.set(promotionHeaderId, {
              promotion_line_id: promotion._id,
              discount_value: best.discount_value,
              min_order_value: best.min_order_value || 0,
            });
          }
        }
      }
    }

    const discountAmount = fixedDiscount + percentageDiscount;
    const finalAmount = Math.max(totalAmount - discountAmount, 0);

    // Tạo hóa đơn
    const invoice = new Invoice({
      customer_id: appointment.customer_id._id,
      employee_id: employeeId,
      appointment_id: appointmentId,
      promotion_header_ids: promotionHeaderIds,
      total_amount: Math.round(totalAmount),
      discount_amount: Math.round(discountAmount),
      final_amount: Math.round(finalAmount),
      status: "pending",
      is_deleted: false,
    });
    await invoice.save();

    // Lưu promotion đã áp dụng
    if (promotionHeaderIds.length > 0) {
      const promotionsToSave = [];
      for (const [, promo] of addedPromotionHeaders.entries()) {
        const promotionValue =
          promo.discount_value > 100
            ? promo.discount_value
            : Math.round(totalAmount * (promo.discount_value / 100));

        promotionsToSave.push({
          promotion_header_id: promo.promotion_line_id,
          value: promotionValue,
          invoice_id: invoice._id,
          is_pay: false,
          is_deleted: false,
        });
      }
      await Promotion.insertMany(promotionsToSave);
    }

    // Lưu chi tiết hóa đơn
    await InvoiceDetail.insertMany(
      invoiceDetails.map((detail) => ({
        invoice_id: invoice._id,
        service_id: detail.service_id,
        price: detail.price,
        quantity: detail.quantity,
        is_deleted: false,
      }))
    );

    // Trả về hóa đơn đầy đủ
    const savedInvoice = await Invoice.findById(invoice._id)
      .populate("customer_id employee_id appointment_id")
      .lean();

    const details = await InvoiceDetail.find({
      invoice_id: invoice._id,
      is_deleted: false,
    })
      .populate("service_id")
      .lean();

    savedInvoice.details = details;

    res.status(201).json({
      message: "Hóa đơn đã được tạo thành công",
      invoice: savedInvoice,
    });
  } catch (err) {
    console.error("Lỗi khi tạo hóa đơn:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ: " + err.message });
  }
};

// ==================== THANH TOÁN TRỰC TIẾP ====================
export const payDirectly = async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
    }
    if (invoice.status !== "pending") {
      return res.status(400).json({
        message: `Hóa đơn đang ở trạng thái ${invoice.status}`,
      });
    }

    invoice.status = "paid";
    await invoice.save();

    // Cộng tổng chi tiêu khách hàng
    const customer = await Customer.findById(invoice.customer_id);
    if (customer) {
      customer.total_spending += invoice.final_amount;
      await customer.save();
    }

    // Cập nhật khuyến mãi
    const promotions = await Promotion.find({ invoice_id: invoiceId });
    for (const promotion of promotions) {
      promotion.is_pay = true;
      await promotion.save();
    }

    res.status(200).json({
      message: "Thanh toán thành công",
      invoice,
    });
  } catch (err) {
    console.error("Lỗi khi thanh toán trực tiếp:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// ==================== THANH TOÁN ONLINE (PAYOS) ====================
export const createPaymentLink = async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
    }
    if (invoice.status !== "pending") {
      return res.status(400).json({
        message: `Hóa đơn đang ở trạng thái ${invoice.status}`,
      });
    }

    // Kiểm tra đã có payment link chưa
    const existingPayment = await Payment.findOne({
      invoice_id: invoiceId,
      payment_status: "pending",
      is_deleted: false,
    });
    if (existingPayment) {
      return res.status(400).json({
        message: "Hóa đơn đã có link thanh toán đang chờ",
      });
    }

    const invoiceDetails = await InvoiceDetail.find({
      invoice_id: invoiceId,
      is_deleted: false,
    }).populate("service_id");

    // ✅ orderCode phải là số nguyên dương
    const orderCode = Math.floor(100000 + Math.random() * 900000);

    const paymentBody = {
      orderCode,
      amount: Math.round(invoice.final_amount), // ✅ số nguyên
      description: `Thanh toan ${orderCode}`, // ✅ dưới 25 ký tự
      items: invoiceDetails.map((detail) => ({
        name: detail.service_id.name.substring(0, 50),
        quantity: detail.quantity,
        price: Math.round(detail.price),
      })),
      cancelUrl: `${process.env.FE_URL}/payment/cancel`,
      returnUrl: `${process.env.FE_URL}/payment/success`,
    };

    // Gọi PayOS API
    const paymentLinkRes = await payOS.createPaymentLink(paymentBody);

    // Lưu payment vào DB
    const payment = new Payment({
      invoice_id: invoice._id,
      order_code: orderCode,
      amount: Math.round(invoice.final_amount),
      payment_link_id: paymentLinkRes.paymentLinkId,
      payment_status: "pending",
      is_deleted: false,
    });
    await payment.save();

    res.status(200).json({
      message: "Tạo link thanh toán thành công",
      checkoutUrl: paymentLinkRes.checkoutUrl, // ✅ redirect khách vào đây
      qrCode: paymentLinkRes.qrCode, // ✅ QR code
      orderCode,
    });
  } catch (err) {
    console.error("Lỗi khi tạo link thanh toán:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ: " + err.message });
  }
};

// ==================== WEBHOOK PAYOS ====================
export const handlePaymentWebhook = async (req, res) => {
  try {
    let webhookData;

    if (process.env.NODE_ENV === "development") {
      // Dev: không verify signature
      webhookData = req.body;
    } else {
      // Production: verify signature
      webhookData = payOS.verifyPaymentWebhookData(req.body);
    }

    const orderCode = webhookData?.data?.orderCode || webhookData?.orderCode;
    const code = webhookData?.code;

    if (!orderCode) {
      return res.status(200).json({ message: "Không có orderCode" });
    }

    const payment = await Payment.findOne({ order_code: orderCode });
    if (!payment) {
      return res.status(200).json({ message: "Không tìm thấy thanh toán" });
    }

    const invoice = await Invoice.findById(payment.invoice_id);
    if (!invoice) {
      return res.status(200).json({ message: "Không tìm thấy hóa đơn" });
    }

    if (code === "00") {
      // ✅ Thanh toán thành công
      payment.payment_status = "paid";
      await payment.save();

      invoice.status = "paid";
      await invoice.save();

      // Cộng tổng chi tiêu
      const customer = await Customer.findById(invoice.customer_id);
      if (customer) {
        customer.total_spending += invoice.final_amount;
        await customer.save();
      }

      // Cập nhật khuyến mãi
      const promotions = await Promotion.find({
        invoice_id: payment.invoice_id,
      });
      for (const promotion of promotions) {
        promotion.is_pay = true;
        await promotion.save();
      }
    } else {
      // ❌ Thanh toán thất bại/hủy
      payment.payment_status = "cancelled";
      await payment.save();

      invoice.status = "cancelled";
      await invoice.save();
    }

    // ✅ Luôn trả 200 để PayOS không retry
    res.status(200).json({ message: "Webhook xử lý thành công" });
  } catch (err) {
    console.error("Lỗi webhook:", err.message);
    res.status(200).json({ message: "Lỗi xử lý webhook" });
  }
};

// ==================== LẤY HÓA ĐƠN ====================
export const getInvoice = async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate("customer_id employee_id appointment_id")
      .lean();

    if (!invoice || invoice.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
    }

    const details = await InvoiceDetail.find({
      invoice_id: invoiceId,
      is_deleted: false,
    })
      .populate("service_id")
      .lean();

    invoice.details = details;

    res.status(200).json({
      message: "Lấy hóa đơn thành công",
      invoice,
    });
  } catch (err) {
    console.error("Lỗi khi lấy hóa đơn:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// ==================== HOÀN TRẢ ====================
export const createRefundInvoice = async (req, res) => {
  const { invoiceId, note } = req.body;
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.is_deleted) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
    }
    if (invoice.status !== "paid") {
      return res.status(400).json({
        message: `Không thể hoàn trả hóa đơn ở trạng thái ${invoice.status}`,
      });
    }

    invoice.status = "back";
    invoice.note = note || "";
    await invoice.save();

    // Trừ tổng chi tiêu
    const customer = await Customer.findById(invoice.customer_id);
    if (customer) {
      customer.total_spending = Math.max(
        customer.total_spending - invoice.final_amount,
        0
      );
      await customer.save();
    }

    // Cập nhật khuyến mãi
    const promotions = await Promotion.find({ invoice_id: invoiceId });
    for (const promotion of promotions) {
      promotion.is_pay = false;
      promotion.is_deleted = true;
      await promotion.save();
    }

    res.status(200).json({ message: "Hoàn trả hóa đơn thành công" });
  } catch (err) {
    console.error("Lỗi khi hoàn trả:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};
