const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    brand: { type: String, required: true, default: "" },
    image: { type: String, required: true, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
  },
  { _id: false }
);

const wishlistItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    brand: { type: String, required: true, default: "" },
    image: { type: String, required: true, default: "" },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: false,
    default: "",
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
    default: "",
  },
  cart: {
    type: [cartItemSchema],
    default: [],
  },
  wishlist: {
    type: [wishlistItemSchema],
    default: [],
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("User", userSchema);
