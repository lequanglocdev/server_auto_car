import express from "express";
import isAdmin from "../middlewares/checkAdmin.js";
import {
  generateInvoice,
  payDirectly,
  createPaymentLink,
  getInvoice,
  createRefundInvoice,
  getAllInvoices,
  downloadInvoicePDF,
  handleVNPayReturn,
} from "../controllers/paymentController.js";

const router = express.Router();

router.get("/vnpay/return", handleVNPayReturn);


// Tạo hóa đơn
router.post("/generate/:appointmentId", [isAdmin], generateInvoice);

router.get("/", [isAdmin], getAllInvoices);

// Lấy hóa đơn
router.get("/:invoiceId", [isAdmin], getInvoice);

// Thanh toán trực tiếp (tiền mặt)
router.post("/pay/directly/:invoiceId", [isAdmin], payDirectly);

// Thanh toán online VNPay
router.post("/pay/online/:invoiceId", [isAdmin], createPaymentLink);


// Hoàn trả
router.post("/refund", [isAdmin], createRefundInvoice);

// Tải hóa đơn PDF
router.get("/pdf/:invoiceId", [isAdmin], downloadInvoicePDF);

export default router;
