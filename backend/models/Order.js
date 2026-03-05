const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    brand: { type: String, required: true, default: "" },
    image: { type: String, required: true, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ["upi", "card", "cod", "razorpay"], required: true },
    upiId: { type: String, default: "" }, // ok for demo apps
    cardLast4: { type: String, default: "" }, // never store full card number/CVV
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    items: { type: [orderItemSchema], required: true, default: [] },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    total: { type: Number, required: true },
    payment: { type: paymentSchema, required: true },
    status: { type: String, default: "paid" }, // demo
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);

