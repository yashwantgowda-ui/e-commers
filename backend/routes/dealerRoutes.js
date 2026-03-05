const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Dealer = require("../models/Dealer");
const Order = require("../models/Order");
const AdminProduct = require("../models/AdminProduct");
const { getAdminDbStatus } = require("../db/adminDb");
const { getJwtSecret } = require("../middleware/auth");
const { dealerAuth } = require("../middleware/dealerAuth");

const router = express.Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isDuplicateKeyError(error) {
  return Boolean(error && (error.code === 11000 || error.code === 11001));
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function requireDb(req, res, next) {
  if (!isDbConnected()) {
    return res.status(503).json({
      message: "Database is unavailable. Please start MongoDB and try again.",
    });
  }
  return next();
}

function signDealerToken(dealer) {
  return jwt.sign(
    {
      dealerId: String(dealer._id || ""),
      email: dealer.email,
      role: "dealer",
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

function formatDealer(dealer) {
  const approvalStatus = String(dealer.approvalStatus || "approved");
  const totalSales = Number(dealer.totalSales || 0);
  const commissionRate = Number(dealer.commissionRate || 0);
  return {
    id: String(dealer._id || ""),
    name: dealer.name,
    email: dealer.email,
    company: dealer.company || "",
    phone: dealer.phone || "",
    isActive: Boolean(dealer.isActive),
    approvalStatus,
    isBlocked: Boolean(dealer.isBlocked),
    totalSales,
    totalOrders: Number(dealer.totalOrders || 0),
    commissionRate,
    commissionAmount: Number(((totalSales * commissionRate) / 100).toFixed(2)),
    lastLoginAt: dealer.lastLoginAt || null,
    createdAt: dealer.createdAt,
  };
}

router.post("/register", requireDb, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const company = String(req.body?.company || "").trim();
    const phone = String(req.body?.phone || "").trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existing = await Dealer.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Dealer email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dealer = await Dealer.create({
      name,
      email,
      password: hashedPassword,
      company,
      phone,
      isActive: true,
      approvalStatus: "pending",
      isBlocked: false,
      totalSales: 0,
      totalOrders: 0,
      commissionRate: 5,
    });

    return res.status(201).json({
      message: "Dealer registration submitted. Wait for admin approval.",
      dealer: formatDealer(dealer),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Dealer email already registered" });
    }
    return res.status(500).json({ message: error?.message || "Dealer registration failed" });
  }
});

router.post("/login", requireDb, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const dealer = await Dealer.findOne({ email, isActive: true });
    if (!dealer) {
      return res.status(401).json({ message: "Invalid dealer credentials" });
    }

    const ok = await bcrypt.compare(password, dealer.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid dealer credentials" });
    }

    if (dealer.isBlocked) {
      return res.status(403).json({ message: "Dealer account is blocked by admin" });
    }

    const approvalStatus = String(dealer.approvalStatus || "approved");
    if (approvalStatus === "pending") {
      return res.status(403).json({ message: "Dealer account is pending admin approval" });
    }
    if (approvalStatus === "rejected") {
      return res.status(403).json({ message: "Dealer account has been rejected by admin" });
    }

    const loginTime = new Date();
    dealer.lastLoginAt = loginTime;
    try {
      await Dealer.updateOne({ _id: dealer._id }, { $set: { lastLoginAt: loginTime } });
    } catch (_e) {
      // Login should not fail because last-login update failed.
    }

    return res.json({
      message: "Dealer login successful",
      token: signDealerToken(dealer),
      dealer: formatDealer(dealer),
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Dealer login failed" });
  }
});

router.get("/me", requireDb, dealerAuth, async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.dealer.dealerId).select("-password");
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });
    return res.json({ dealer: formatDealer(dealer) });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Failed to fetch dealer profile" });
  }
});

router.get("/summary", requireDb, dealerAuth, async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.dealer.dealerId).select("-password");
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const adminDbStatus = getAdminDbStatus();
    let totalProducts = 0;
    let outOfStockProducts = 0;
    if (adminDbStatus.readyState === 1) {
      try {
        const [total, outOfStock] = await Promise.all([
          AdminProduct.countDocuments({ active: true }),
          AdminProduct.countDocuments({ active: true, stock: { $lte: 0 } }),
        ]);
        totalProducts = total;
        outOfStockProducts = outOfStock;
      } catch (_e) {
        totalProducts = 0;
        outOfStockProducts = 0;
      }
    }

    const [ordersCount, paidOrdersCount, pendingOrdersCount, paidAgg, pendingAgg] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "paid" }),
      Order.countDocuments({ status: { $ne: "paid" } }),
      Order.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, amount: { $sum: "$total" } } },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: "paid" } } },
        { $group: { _id: null, amount: { $sum: "$total" } } },
      ]),
    ]);

    const paidAmount = Number(paidAgg?.[0]?.amount || 0);
    const pendingAmount = Number(pendingAgg?.[0]?.amount || 0);
    const averageOrderValue = ordersCount > 0 ? paidAmount / ordersCount : 0;

    return res.json({
      totalProducts: Number(totalProducts || 0),
      outOfStockProducts: Number(outOfStockProducts || 0),
      totalOrders: Number(dealer.totalOrders || ordersCount || 0),
      paidOrders: Number(paidOrdersCount || 0),
      pendingOrders: Number(pendingOrdersCount || 0),
      totalEarnings: Number(dealer.totalSales || paidAmount || 0),
      pendingPayments: Number(pendingAmount || 0),
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Failed to load dealer summary" });
  }
});

module.exports = router;
