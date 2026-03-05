const mongoose = require("mongoose");
const { getAdminConnection } = require("../db/adminDb");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "admin" },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, bufferCommands: false }
);

const connection = getAdminConnection();

module.exports = connection.models.Admin || connection.model("Admin", adminSchema);
