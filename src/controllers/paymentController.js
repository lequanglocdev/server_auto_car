import Invoice from "../models/Invoice.js";
import InvoiceDetail from "../models/InvoiceDetail.js";
import AppointmentService from "../models/AppointmentService.js";
import PriceLine from "../models/PriceLine.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import Customer from "../models/Customer.js";
import PromotionLine from "../models/PromotionLine.js";
import PromotionDetail from "../models/PromotionDetail.js";
import Promotion from "../models/Promotion.js";
import Payment from "../models/Payment.js";
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Native ESM — không có vấn đề import
import { VNPay, ignoreLogger, ProductCode, VnpLocale } from "vnpay";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// ✅ Thay bằng lazy getter
const getVNPay = () =>
  new VNPay({
    tmnCode: process.env.VNP_TMN_CODE,
    secureSecret: process.env.VNP_HASH_SECRET,
    vnpayHost: "https://sandbox.vnpayment.vn",
    testMode: process.env.NODE_ENV !== "production",
    hashAlgorithm: "SHA512",
    enableLog: false,
    loggerFn: ignoreLogger,
  });

// ==================== LẤY DANH SÁCH HÓA ĐƠN ====================

export const getAllInvoices = async (req, res) => {
  try {
    const { status, date } = req.query;
    const query = { is_deleted: false };

    if (status) query.status = status;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.created_at = { $gte: startOfDay, $lte: endOfDay };
    }

    const invoices = await Invoice.find(query)
      .populate("customer_id", "name phone_number email")
      .populate("appointment_id", "appointment_datetime")
      .populate("employee_id", "name")
      .sort({ created_at: -1 })
      .lean();

    res.status(200).json({ invoices });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách hóa đơn:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// ==================== TẠO HÓA ĐƠN ====================

export const generateInvoice = async (req, res) => {
  const { appointmentId } = req.params;
  const employeeId = req.user.id;

  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate("vehicle_id customer_id")
      .lean();
    if (!appointment || appointment.is_deleted)
      return res.status(404).json({ message: "Không tìm thấy lịch hẹn" });
    if (appointment.status !== "completed")
      return res.status(400).json({ message: "Lịch hẹn chưa hoàn thành" });

    const invoiceExist = await Invoice.findOne({
      appointment_id: appointmentId,
      is_deleted: false,
    });
    if (invoiceExist)
      return res.status(400).json({ message: "Hóa đơn đã được tạo" });

    const employee = await User.findById(employeeId);
    if (!employee || employee.is_deleted)
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });

    const appointmentServices = await AppointmentService.find({
      appointment_id: appointmentId,
      is_deleted: false,
    })
      .populate("price_line_id")
      .lean();

    if (appointmentServices.length === 0)
      return res
        .status(400)
        .json({ message: "Không có dịch vụ nào trong lịch hẹn" });

    let totalAmount = 0;
    const invoiceDetails = [];

    for (let appService of appointmentServices) {
      const priceLine = await PriceLine.findById(
        appService.price_line_id._id
      ).populate("service_id");

      if (!priceLine)
        return res.status(400).json({ message: "Không tìm thấy bảng giá" });

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
      if (!promotion.promotion_header_id) continue;

      const promotionHeaderId = promotion.promotion_header_id._id.toString();
      const promotionDetails = await PromotionDetail.find({
        promotion_line_id: promotion._id,
        is_deleted: false,
      });

      if (promotion.discount_type == 2) {
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

    await InvoiceDetail.insertMany(
      invoiceDetails.map((detail) => ({
        invoice_id: invoice._id,
        service_id: detail.service_id,
        price: detail.price,
        quantity: detail.quantity,
        is_deleted: false,
      }))
    );

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
    if (!invoice || invoice.is_deleted)
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
    if (invoice.status !== "pending")
      return res
        .status(400)
        .json({ message: `Hóa đơn đang ở trạng thái ${invoice.status}` });

    await Invoice.updateOne({ _id: invoiceId }, { status: "paid" });

    const customer = await Customer.findById(invoice.customer_id);
    if (customer) {
      customer.total_spending += invoice.final_amount;
      await customer.save();
    }

    const promotions = await Promotion.find({ invoice_id: invoiceId });
    for (const promotion of promotions) {
      promotion.is_pay = true;
      await promotion.save();
    }

    const updatedInvoice = await Invoice.findById(invoiceId)
      .populate("customer_id", "name phone_number email address")
      .populate("employee_id", "username email")
      .populate("appointment_id", "appointment_datetime")
      .lean();

    const details = await InvoiceDetail.find({
      invoice_id: invoiceId,
      is_deleted: false,
    })
      .populate("service_id", "name")
      .lean();

    updatedInvoice.details = details;

    res
      .status(200)
      .json({ message: "Thanh toán thành công", invoice: updatedInvoice });
  } catch (err) {
    console.error("Lỗi khi thanh toán trực tiếp:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// ==================== THANH TOÁN ONLINE (VNPAY) ====================

export const createPaymentLink = async (req, res) => {
  const { invoiceId } = req.params;
  try {
     const vnpay = getVNPay();
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice || invoice.is_deleted)
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
    if (invoice.status !== "pending")
      return res
        .status(400)
        .json({ message: `Hóa đơn đang ở trạng thái ${invoice.status}` });

    const existingPayment = await Payment.findOne({
      invoice_id: invoiceId,
      payment_status: "pending",
      is_deleted: false,
    });
    if (existingPayment)
      return res
        .status(400)
        .json({ message: "Hóa đơn đã có link thanh toán đang chờ" });

    // txnRef dùng làm key tra cứu sau khi VNPay redirect về — phải unique
    const txnRef = `INV-${invoiceId}-${Date.now()}`;

    const checkoutUrl = vnpay.buildPaymentUrl({
      vnp_Amount: Math.round(invoice.final_amount),
      vnp_IpAddr: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan hoa don ${invoiceId}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: `${process.env.BE_URL}/invoices/vnpay/return`,
      vnp_Locale: VnpLocale.VN,
    });

    await new Payment({
      invoice_id: invoice._id,
      order_code: txnRef,
      amount: Math.round(invoice.final_amount),
      payment_status: "pending",
      is_deleted: false,
    }).save();

    res.status(200).json({
      message: "Tạo link thanh toán thành công",
      checkoutUrl,
      orderCode: txnRef,
    });

    
  } catch (err) {
    console.error("Lỗi khi tạo link thanh toán:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ: " + err.message });
  }
};

// ==================== RETURN URL TỪ VNPAY ====================
// VNPay redirect về đây sau khi khách thanh toán xong (thành công hoặc thất bại)

export const handleVNPayReturn = async (req, res) => {
  try {
     const vnpay = getVNPay();
    const verify = vnpay.verifyReturnUrl(req.query);

    const txnRef = req.query.vnp_TxnRef;
    const payment = await Payment.findOne({ order_code: txnRef });

    if (!payment) {
      return res.redirect(`${process.env.FE_URL}/payment/cancel`);
    }

    const invoice = await Invoice.findById(payment.invoice_id);

    if (!verify.isVerified || !verify.isSuccess) {
      // Chữ ký không hợp lệ hoặc thanh toán thất bại/hủy
      payment.payment_status = "cancelled";
      await payment.save();

      if (invoice) {
        invoice.status = "cancelled";
        await invoice.save();
      }

      return res.redirect(`${process.env.FE_URL}/payment/cancel`);
    }

    // ✅ Thanh toán thành công
    payment.payment_status = "paid";
    await payment.save();

    if (invoice) {
      invoice.status = "paid";
      await invoice.save();

      const customer = await Customer.findById(invoice.customer_id);
      if (customer) {
        customer.total_spending += invoice.final_amount;
        await customer.save();
      }

      const promotions = await Promotion.find({ invoice_id: invoice._id });
      for (const p of promotions) {
        p.is_pay = true;
        await p.save();
      }
    }

    // Redirect về FE kèm txnRef để FE hiển thị
    res.redirect(`${process.env.FE_URL}/payment/success?orderCode=${txnRef}`);
  } catch (err) {
    console.error("Lỗi VNPay return:", err.message);
    res.redirect(`${process.env.FE_URL}/payment/cancel`);
  }
};

// ==================== LẤY HÓA ĐƠN ====================

export const getInvoice = async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate("customer_id employee_id appointment_id")
      .lean();

    if (!invoice || invoice.is_deleted)
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });

    const details = await InvoiceDetail.find({
      invoice_id: invoiceId,
      is_deleted: false,
    })
      .populate("service_id")
      .lean();

    invoice.details = details;

    res.status(200).json({ message: "Lấy hóa đơn thành công", invoice });
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
    if (!invoice || invoice.is_deleted)
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
    if (invoice.status !== "paid")
      return res.status(400).json({
        message: `Không thể hoàn trả hóa đơn ở trạng thái ${invoice.status}`,
      });

    invoice.status = "back";
    invoice.note = note || "";
    await invoice.save();

    const customer = await Customer.findById(invoice.customer_id);
    if (customer) {
      customer.total_spending = Math.max(
        customer.total_spending - invoice.final_amount,
        0
      );
      await customer.save();
    }

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

// ==================== XUẤT PDF HÓA ĐƠN ====================

export const downloadInvoicePDF = async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const savedInvoice = await Invoice.findById(invoiceId)
      .populate("customer_id")
      .populate("employee_id", "username email")
      .populate("appointment_id")
      .populate("promotion_header_ids")
      .lean();

    if (!savedInvoice || savedInvoice.is_deleted)
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
    if (savedInvoice.status !== "paid" && savedInvoice.status !== "back")
      return res.status(400).json({ message: "Hóa đơn chưa được thanh toán" });

    const invoiceDetailList = await InvoiceDetail.find({
      invoice_id: invoiceId,
      is_deleted: false,
    })
      .populate("service_id")
      .lean();
    savedInvoice.details = invoiceDetailList;

    if (savedInvoice.promotion_header_ids?.length > 0) {
      const promotionLineIds = savedInvoice.promotion_header_ids.map(
        (l) => l._id
      );
      const promotionDetails = await PromotionDetail.find({
        promotion_line_id: { $in: promotionLineIds },
        is_deleted: false,
      }).lean();

      savedInvoice.promotion_header_ids.forEach((line) => {
        line.details = promotionDetails.filter(
          (d) => d.promotion_line_id.toString() === line._id.toString()
        );
      });
    }

    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=invoice_${invoiceId}.pdf`,
      });
      res.send(pdfData);
    });

    const fontRegular = path.join(__dirname, "../fonts/Roboto-Regular.ttf");
    const fontBold = path.join(__dirname, "../fonts/Roboto-Bold.ttf");
    doc.registerFont("Regular", fontRegular);
    doc.registerFont("Bold", fontBold);

    const logoPath = path.join(__dirname, "../fonts/logo.png");
    const fs = await import("fs");
    const hasLogo = fs.existsSync(logoPath);

    doc.rect(0, 0, doc.page.width, doc.page.height).fillColor("#e0e0e0").fill();

    if (hasLogo) {
      const lw = doc.page.width * 0.15;
      const op = 0.05;
      doc.image(logoPath, 20, 20, { width: lw, opacity: op });
      doc.image(logoPath, doc.page.width - lw - 20, 20, {
        width: lw,
        opacity: op,
      });
      doc.image(logoPath, 20, doc.page.height - lw - 20, {
        width: lw,
        opacity: op,
      });
      doc.image(logoPath, doc.page.width - lw - 20, doc.page.height - lw - 20, {
        width: lw,
        opacity: op,
      });
    }

    if (savedInvoice.status === "back") {
      doc
        .font("Bold")
        .fontSize(20)
        .fillColor("red")
        .text("HÓA ĐƠN HOÀN TRẢ", { align: "center" });
    } else {
      doc
        .font("Bold")
        .fontSize(20)
        .fillColor("black")
        .text("HÓA ĐƠN DỊCH VỤ", { align: "center" });
    }
    doc.moveDown();

    const customer = savedInvoice.customer_id;
    doc.font("Regular").fontSize(12).fillColor("black");
    doc
      .text(`Tên khách hàng: ${customer?.name ?? "—"}`)
      .text(`Email: ${customer?.email ?? "—"}`)
      .text(`Địa chỉ: ${customer?.address ?? "—"}`)
      .text(`Số điện thoại: ${customer?.phone_number ?? "—"}`);

    if (savedInvoice.status === "back")
      doc.text(`Lý do hoàn trả: ${savedInvoice.note || "Không có"}`);
    doc.moveDown();

    if (savedInvoice.employee_id)
      doc.text(`Nhân viên xử lý: ${savedInvoice.employee_id.username ?? "—"}`);
    if (savedInvoice.appointment_id) {
      const formattedDate = new Date(
        savedInvoice.appointment_id.appointment_datetime
      ).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      doc.text(`Thời gian: ${formattedDate}`).moveDown();
    }

    const tableWidth = doc.page.width * 0.8;
    const startX = (doc.page.width - tableWidth) / 2;
    const cellPadding = 5;
    const rowHeight = 25;
    const colWidths = [
      tableWidth * 0.4,
      tableWidth * 0.1,
      tableWidth * 0.25,
      tableWidth * 0.25,
    ];

    const drawRow = (y, rowData) => {
      const cells = [
        rowData.name,
        rowData.quantity,
        rowData.unitPrice,
        rowData.totalPrice,
      ];
      let x = startX;
      cells.forEach((cell, i) => {
        const w = colWidths[i];
        doc.rect(x, y, w, rowHeight).stroke();
        doc
          .font("Regular")
          .fontSize(10)
          .fillColor("black")
          .text(String(cell), x + cellPadding, y + cellPadding, {
            width: w - cellPadding * 2,
            align: "center",
          });
        x += w;
      });
    };

    doc.moveDown();
    let currentY = doc.y;

    doc.font("Bold");
    drawRow(currentY, {
      name: "Tên dịch vụ",
      quantity: "SL",
      unitPrice: "Đơn giá",
      totalPrice: "Thành tiền",
    });
    currentY += rowHeight;

    doc.font("Regular");
    savedInvoice.details.forEach((detail) => {
      drawRow(currentY, {
        name: detail.service_id?.name ?? "—",
        quantity: detail.quantity,
        unitPrice: `${detail.price.toLocaleString("vi-VN")} đ`,
        totalPrice: `${(detail.price * detail.quantity).toLocaleString(
          "vi-VN"
        )} đ`,
      });
      currentY += rowHeight;
    });

    if (savedInvoice.promotion_header_ids?.length > 0) {
      const promoColWidths = [
        tableWidth * 0.55,
        tableWidth * 0.2,
        tableWidth * 0.25,
      ];
      const drawPromoRow = (y, rowData) => {
        const cells = [
          rowData.name,
          rowData.discountType,
          rowData.discountValue,
        ];
        let x = startX;
        cells.forEach((cell, i) => {
          const w = promoColWidths[i];
          doc.rect(x, y, w, rowHeight).stroke();
          doc
            .font("Regular")
            .fontSize(10)
            .fillColor("black")
            .text(String(cell), x + cellPadding, y + cellPadding, {
              width: w - cellPadding * 2,
              align: "center",
            });
          x += w;
        });
      };

      doc.moveDown(2);
      currentY = doc.y;
      doc.font("Bold");
      drawPromoRow(currentY, {
        name: "Tên khuyến mãi",
        discountType: "Loại giảm",
        discountValue: "Giá trị",
      });
      currentY += rowHeight;

      doc.font("Regular");
      savedInvoice.promotion_header_ids.forEach((promotion) => {
        const detail = promotion.details?.[0];
        const discountValue =
          promotion.discount_type == 1
            ? `${detail?.discount_value ?? 0}%`
            : `${(detail?.discount_value ?? 0).toLocaleString("vi-VN")} đ`;
        drawPromoRow(currentY, {
          name: promotion.description ?? "—",
          discountType:
            promotion.discount_type == 1 ? "Phần trăm" : "Trực tiếp",
          discountValue,
        });
        currentY += rowHeight;
      });
    }

    doc.moveDown(2).font("Regular").fontSize(13).fillColor("black");
    if (savedInvoice.status === "back") {
      doc
        .text(
          `Tổng tiền: ${savedInvoice.total_amount.toLocaleString("vi-VN")} đ`
        )
        .moveDown(0.5)
        .text(
          `Giảm giá: ${savedInvoice.discount_amount.toLocaleString("vi-VN")} đ`
        )
        .moveDown(0.5)
        .font("Bold")
        .fontSize(14)
        .text(
          `Hoàn trả: ${savedInvoice.final_amount.toLocaleString("vi-VN")} đ`
        );
    } else {
      doc
        .text(
          `Tổng tiền: ${savedInvoice.total_amount.toLocaleString("vi-VN")} đ`
        )
        .moveDown(0.5)
        .text(
          `Giảm giá: ${savedInvoice.discount_amount.toLocaleString("vi-VN")} đ`
        )
        .moveDown(0.5)
        .font("Bold")
        .fontSize(14)
        .text(
          `Thành tiền: ${savedInvoice.final_amount.toLocaleString("vi-VN")} đ`
        );
    }

    doc
      .moveDown(2)
      .font("Regular")
      .fontSize(10)
      .fillColor("#555555")
      .text("Cảm ơn quý khách đã sử dụng dịch vụ!", { align: "center" })
      .text("Hóa đơn được xuất tự động từ hệ thống.", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Lỗi khi xuất PDF:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ: " + err.message });
  }
};
