const mongoose = require("mongoose");
const { getAdminConnection } = require("../db/adminDb");

const adminProductSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true, default: "Brand" },
    category: { type: String, required: true, trim: true, default: "All Phones" },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    rating: { type: Number, required: true, min: 0, max: 5, default: 4.5 },
    reviews: { type: Number, required: true, min: 0, default: 0 },
    image: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    specs: { type: [String], default: [] },
    colors: { type: [String], default: ["#0066FF", "#000000", "#A0A0A0"] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, bufferCommands: false }
);

const connection = getAdminConnection();

module.exports =
  connection.models.AdminProduct ||
  connection.model("AdminProduct", adminProductSchema);
