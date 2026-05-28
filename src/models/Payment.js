// models/Payment.js
import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
    {
        invoice_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
            required: true,
        },
        order_code: {
            type: String    ,
            required: true,
            unique: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        payment_link_id: {
            type: String,
            default: "",
        },
        payment_status: {
            type: String,
            enum: ["pending", "paid", "cancelled"],
            default: "pending",
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Payment = mongoose.model("Payment", PaymentSchema);
export default Payment;
