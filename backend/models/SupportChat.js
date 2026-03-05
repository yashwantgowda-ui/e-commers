const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    senderId: {
      type: String,
      default: "",
      trim: true,
    },
    senderName: {
      type: String,
      default: "",
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const supportChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    userName: {
      type: String,
      default: "",
      trim: true,
    },
    userEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
    unreadForAdmin: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadForUser: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMessagePreview: {
      type: String,
      default: "",
      trim: true,
      maxlength: 180,
    },
    messages: {
      type: [supportMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

supportChatSchema.index({ unreadForAdmin: -1, lastMessageAt: -1 });

module.exports = mongoose.models.SupportChat || mongoose.model("SupportChat", supportChatSchema);
