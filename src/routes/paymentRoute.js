import express from "express";
import isAdmin from "../middlewares/checkAdmin.js";
import {
  generateInvoice,
  payDirectly,
  createPaymentLink,
  handlePaymentWebhook,
  getInvoice,
  createRefundInvoice,
} from "../controllers/paymentController.js";

const router = express.Router();

// Tạo hóa đơn
router.post("/generate/:appointmentId", [isAdmin], generateInvoice);

// Lấy hóa đơn
router.get("/:invoiceId", [isAdmin], getInvoice);

// Thanh toán trực tiếp (tiền mặt)
router.post("/pay/directly/:invoiceId", [isAdmin], payDirectly);

// Thanh toán online PayOS
router.post("/pay/online/:invoiceId", [isAdmin], createPaymentLink);

// Webhook PayOS (public - không cần auth)
router.post("/webhook", handlePaymentWebhook);

// Hoàn trả
router.post("/refund", [isAdmin], createRefundInvoice);

export default router;
