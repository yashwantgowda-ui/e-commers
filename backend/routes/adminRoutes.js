const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Admin = require("../models/Admin");
const AdminProduct = require("../models/AdminProduct");
const Dealer = require("../models/Dealer");
const User = require("../models/User");
const Order = require("../models/Order");
const SupportChat = require("../models/SupportChat");
const { getJwtSecret } = require("../middleware/auth");
const { adminAuth } = require("../middleware/adminAuth");
const { getAdminDbStatus } = require("../db/adminDb");

const router = express.Router();
let seedDone = false;
let seedInProgress = false;
const ADMIN_QUERY_TIMEOUT_MS = 5000;
const FALLBACK_PRODUCT_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="100%" height="100%" fill="#0d1628"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#8da3c9" font-family="Arial" font-size="20">No Image</text></svg>'
  );

function isTimeoutLikeError(err) {
  return /timed out|timeout|buffering timed out/i.test(String(err?.message || ""));
}

async function withTimeout(promise, timeoutMs = ADMIN_QUERY_TIMEOUT_MS, label = "Admin query") {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isAdminDbReady() {
  const status = getAdminDbStatus();
  return status.readyState === 1;
}

function isMainDbReady() {
  return mongoose.connection.readyState === 1;
}

function toIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function toObjectIdTimestamp(value) {
  if (!value) return null;
  if (typeof value.getTimestamp === "function") {
    return toIsoDate(value.getTimestamp());
  }
  if (mongoose.isValidObjectId(value)) {
    return toIsoDate(new mongoose.Types.ObjectId(value).getTimestamp());
  }
  return null;
}

function formatSummaryUser(user) {
  return {
    id: String(user?._id || ""),
    name: String(user?.fullName || ""),
    email: String(user?.email || ""),
    phoneNumber: String(user?.phoneNumber || ""),
    lastLoginAt: toIsoDate(user?.lastLoginAt),
    createdAt: toIsoDate(user?.createdAt) || toObjectIdTimestamp(user?._id),
  };
}

function formatSummaryDealer(dealer) {
  const totalSales = toNumber(dealer?.totalSales, 0);
  const commissionRate = toNumber(dealer?.commissionRate, 0);
  return {
    id: String(dealer?._id || ""),
    name: String(dealer?.name || ""),
    email: String(dealer?.email || ""),
    company: String(dealer?.company || ""),
    phone: String(dealer?.phone || ""),
    isActive: Boolean(dealer?.isActive),
    approvalStatus: String(dealer?.approvalStatus || "approved"),
    isBlocked: Boolean(dealer?.isBlocked),
    totalSales,
    totalOrders: toNumber(dealer?.totalOrders, 0),
    commissionRate,
    commissionAmount: Number(((totalSales * commissionRate) / 100).toFixed(2)),
    lastLoginAt: toIsoDate(dealer?.lastLoginAt),
    createdAt: toIsoDate(dealer?.createdAt),
  };
}

function isValidDealerApprovalStatus(value) {
  return value === "pending" || value === "approved" || value === "rejected";
}

function formatSummaryOrder(order) {
  return {
    id: String(order?._id || ""),
    userId: String(order?.userId || ""),
    total: toNumber(order?.total, 0),
    status: String(order?.status || ""),
    itemsCount: Array.isArray(order?.items) ? order.items.length : 0,
    createdAt: toIsoDate(order?.createdAt),
  };
}

function requireAdminDb(req, res, next) {
  const status = getAdminDbStatus();
  if (status.readyState !== 1) {
    return res.status(503).json({
      message: "Admin database is unavailable. Please try again in a few seconds.",
      db: status,
    });
  }
  return next();
}

function requireMainDb(req, res, next) {
  if (!isMainDbReady()) {
    return res.status(503).json({
      message: "Main database is unavailable. Please try again in a few seconds.",
    });
  }
  return next();
}

function sanitizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

function usernameFromEmail(email) {
  const local = sanitizeEmail(email).split("@")[0] || "";
  return sanitizeUsername(local) || "admin";
}

async function ensureUniqueUsername(base, excludeId = null) {
  const seed = sanitizeUsername(base) || "admin";
  let candidate = seed;
  let suffix = 1;

  while (
    await Admin.exists({
      username: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    candidate = `${seed}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeProductImage(value) {
  const image = String(value || "").trim();
  if (/^https?:\/\/\S+$/i.test(image)) return image;
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(image)) return image;
  return "";
}

function toProductImage(value) {
  return normalizeProductImage(value) || FALLBACK_PRODUCT_IMAGE;
}

async function ensureDefaultAdmin() {
  if (seedDone || seedInProgress) return;
  if (!isAdminDbReady()) return;

  seedInProgress = true;
  try {
    const existing = await withTimeout(
      Admin.countDocuments(),
      ADMIN_QUERY_TIMEOUT_MS,
      "Admin seed check"
    );
    if (existing > 0) {
      const missingUsername = await withTimeout(
        Admin.find({
          $or: [{ username: { $exists: false } }, { username: null }, { username: "" }],
        }).select("_id email"),
        ADMIN_QUERY_TIMEOUT_MS,
        "Admin username migration"
      );

      for (const row of missingUsername) {
        const base = usernameFromEmail(row.email);
        const uniqueUsername = await ensureUniqueUsername(base, row._id);
        await withTimeout(
          Admin.updateOne({ _id: row._id }, { $set: { username: uniqueUsername } }),
          ADMIN_QUERY_TIMEOUT_MS,
          "Admin username update"
        );
      }
      seedDone = true;
      return;
    }

    const email = sanitizeEmail(process.env.ADMIN_EMAIL || "admin@phonehub.com");
    const username = await ensureUniqueUsername(
      sanitizeUsername(process.env.ADMIN_USERNAME || "admin")
    );
    const rawPassword = String(process.env.ADMIN_PASSWORD || "admin123");
    const name = String(process.env.ADMIN_NAME || "Store Admin").trim();
    const password = await bcrypt.hash(rawPassword, 10);

    await withTimeout(
      Admin.create({
        name,
        username,
        email,
        password,
        role: "admin",
        isActive: true,
      }),
      ADMIN_QUERY_TIMEOUT_MS,
      "Default admin create"
    );
    seedDone = true;
    console.log(`Default admin created: ${email}`);
  } finally {
    seedInProgress = false;
  }
}

function formatProductForClient(product) {
  return {
    id: product._id.toString(),
    productId: product.productId,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    originalPrice: product.originalPrice,
    stock: product.stock,
    rating: product.rating,
    reviews: product.reviews,
    image: toProductImage(product.image),
    description: product.description,
    specs: product.specs,
    colors: product.colors,
    active: product.active,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function formatPublicProduct(product) {
  return {
    id: product.productId,
    productId: product.productId,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    originalPrice: product.originalPrice,
    rating: product.rating,
    reviews: product.reviews,
    image: toProductImage(product.image),
    description: product.description,
    specs: product.specs,
    colors: product.colors,
    inStock: Number(product.stock || 0) > 0,
    stock: product.stock,
    discount:
      product.originalPrice > product.price
        ? `${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF`
        : "",
  };
}

async function getNextProductId() {
  const row = await AdminProduct.findOne({}, { productId: 1 }).sort({ productId: -1 }).lean();
  const last = Number(row?.productId || 0);
  return last + 1;
}

// Never block request handling on background seed work.
router.use((_req, _res, next) => {
  ensureDefaultAdmin().catch((e) => {
    console.error("Default admin setup failed:", e?.message || e);
  });
  next();
});

router.post("/login", requireAdminDb, async (req, res) => {
  try {
    const identifier = String(
      req.body?.identifier ?? req.body?.username ?? req.body?.email ?? ""
    ).trim();
    const password = String(req.body?.password || "");
    const email = sanitizeEmail(identifier);
    const username = sanitizeUsername(identifier);

    if (!identifier || !password) {
      return res.status(400).json({ message: "Username/email and password are required" });
    }

    const admin = await withTimeout(
      Admin.findOne({
        isActive: true,
        $or: [{ email }, { username }],
      }),
      ADMIN_QUERY_TIMEOUT_MS,
      "Admin login lookup"
    );
    if (!admin) return res.status(401).json({ message: "Invalid admin credentials" });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ message: "Invalid admin credentials" });

    const loginTime = new Date();
    admin.lastLoginAt = loginTime;
    try {
      await withTimeout(
        Admin.updateOne({ _id: admin._id }, { $set: { lastLoginAt: loginTime } }),
        ADMIN_QUERY_TIMEOUT_MS,
        "Admin login update"
      );
    } catch (_e) {
      // Login should still succeed if last-login update fails.
    }

    const token = jwt.sign(
      {
        adminId: admin._id.toString(),
        email: admin.email,
        role: "admin",
      },
      getJwtSecret(),
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      admin: {
        id: admin._id.toString(),
        name: admin.name,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Admin database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Admin login failed" });
  }
});

router.get("/me", requireAdminDb, adminAuth, async (req, res) => {
  try {
    const admin = await withTimeout(
      Admin.findById(req.admin.adminId).select("-password"),
      ADMIN_QUERY_TIMEOUT_MS,
      "Admin profile lookup"
    );
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.json({ admin });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Admin database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to fetch admin profile" });
  }
});

router.get("/products", requireAdminDb, adminAuth, async (_req, res) => {
  try {
    const products = await withTimeout(
      AdminProduct.find().sort({ createdAt: -1 }),
      ADMIN_QUERY_TIMEOUT_MS,
      "Products fetch"
    );
    return res.json({ products: products.map(formatProductForClient) });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Admin database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to fetch products" });
  }
});

router.get("/summary", requireAdminDb, adminAuth, async (_req, res) => {
  try {
    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
      lowStockProducts,
      stockAgg,
      lowStockAlertProducts,
    ] = await withTimeout(
      Promise.all([
        AdminProduct.countDocuments(),
        AdminProduct.countDocuments({ active: true }),
        AdminProduct.countDocuments({ stock: { $lte: 0 } }),
        AdminProduct.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
        AdminProduct.aggregate([{ $group: { _id: null, totalStockItems: { $sum: "$stock" } } }]),
        AdminProduct.find(
          { stock: { $gte: 0, $lte: 5 } },
          "name brand category stock"
        )
          .sort({ stock: 1, createdAt: -1 })
          .limit(8)
          .lean(),
      ]),
      ADMIN_QUERY_TIMEOUT_MS,
      "Summary fetch"
    );

    const summary = {
      totalProducts: toNumber(totalProducts, 0),
      activeProducts: toNumber(activeProducts, 0),
      outOfStockProducts: toNumber(outOfStockProducts, 0),
      lowStockProducts: toNumber(lowStockProducts, 0),
      totalStockItems: toNumber(stockAgg?.[0]?.totalStockItems, 0),
      lowStockAlerts: Array.isArray(lowStockAlertProducts)
        ? lowStockAlertProducts.map((row) => ({
            id: String(row?._id || ""),
            name: String(row?.name || ""),
            brand: String(row?.brand || ""),
            category: String(row?.category || ""),
            stock: toNumber(row?.stock, 0),
          }))
        : [],
      mainDbConnected: isMainDbReady(),
      mainDbError: "",
      totalUsers: 0,
      totalCustomers: 0,
      totalDealers: 0,
      activeDealers: 0,
      inactiveDealers: 0,
      approvedDealers: 0,
      pendingDealers: 0,
      rejectedDealers: 0,
      blockedDealers: 0,
      totalOrders: 0,
      paidOrders: 0,
      placedOrders: 0,
      totalSales: 0,
      activeLoginsNow: 0,
      recentLogins24h: 0,
      totalAccountsLoggedIn: 0,
      monthlyRevenue: [],
      yearlyRevenue: [],
      recentUsers: [],
      recentDealers: [],
      recentOrders: [],
    };

    if (summary.mainDbConnected) {
      try {
        const now = Date.now();
        const nowDate = new Date();
        const currentYear = nowDate.getFullYear();
        const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
        const startOfNextYear = new Date(Date.UTC(currentYear + 1, 0, 1));
        const startYear = currentYear - 5;
        const startYearDate = new Date(Date.UTC(startYear, 0, 1));
        const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const activeSince = new Date(now - 15 * 60 * 1000);
        const last24hSince = new Date(now - 24 * 60 * 60 * 1000);

        const [
          totalUsers,
          totalDealers,
          activeDealers,
          approvedDealers,
          pendingDealers,
          rejectedDealers,
          blockedDealers,
          totalOrders,
          paidOrders,
          placedOrders,
          totalSalesAgg,
          monthlyRevenueAgg,
          yearlyRevenueAgg,
          usersLoggedIn,
          dealersLoggedIn,
          adminsLoggedIn,
          usersLogins24h,
          dealersLogins24h,
          adminsLogins24h,
          usersActiveNow,
          dealersActiveNow,
          adminsActiveNow,
          recentUsers,
          recentDealers,
          recentOrders,
        ] = await withTimeout(
          Promise.all([
            User.countDocuments(),
            Dealer.countDocuments(),
            Dealer.countDocuments({ isActive: true }),
            Dealer.countDocuments({ approvalStatus: "approved" }),
            Dealer.countDocuments({ approvalStatus: "pending" }),
            Dealer.countDocuments({ approvalStatus: "rejected" }),
            Dealer.countDocuments({ isBlocked: true }),
            Order.countDocuments(),
            Order.countDocuments({ status: "paid" }),
            Order.countDocuments({ status: "placed" }),
            Order.aggregate([{ $group: { _id: null, totalSales: { $sum: "$total" } } }]),
            Order.aggregate([
              { $match: { createdAt: { $gte: startOfYear, $lt: startOfNextYear } } },
              {
                $group: {
                  _id: { $month: "$createdAt" },
                  revenue: { $sum: "$total" },
                  orders: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ]),
            Order.aggregate([
              { $match: { createdAt: { $gte: startYearDate } } },
              {
                $group: {
                  _id: { $year: "$createdAt" },
                  revenue: { $sum: "$total" },
                  orders: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ]),
            User.countDocuments({ lastLoginAt: { $ne: null } }),
            Dealer.countDocuments({ lastLoginAt: { $ne: null } }),
            Admin.countDocuments({ lastLoginAt: { $ne: null } }),
            User.countDocuments({ lastLoginAt: { $gte: last24hSince } }),
            Dealer.countDocuments({ lastLoginAt: { $gte: last24hSince } }),
            Admin.countDocuments({ lastLoginAt: { $gte: last24hSince } }),
            User.countDocuments({ lastLoginAt: { $gte: activeSince } }),
            Dealer.countDocuments({ lastLoginAt: { $gte: activeSince } }),
            Admin.countDocuments({ lastLoginAt: { $gte: activeSince } }),
            User.find({}, "fullName email phoneNumber lastLoginAt createdAt")
              .sort({ _id: -1 })
              .limit(6)
              .lean(),
            Dealer.find(
              {},
              "name email company phone isActive approvalStatus isBlocked totalSales totalOrders commissionRate lastLoginAt createdAt"
            )
              .sort({ createdAt: -1, _id: -1 })
              .limit(6)
              .lean(),
            Order.find({}, "userId total status items createdAt")
              .sort({ createdAt: -1, _id: -1 })
              .limit(8)
              .lean(),
          ]),
          ADMIN_QUERY_TIMEOUT_MS,
          "Main summary fetch"
        );

        summary.totalUsers = toNumber(totalUsers, 0);
        summary.totalCustomers = summary.totalUsers;
        summary.totalDealers = toNumber(totalDealers, 0);
        summary.activeDealers = toNumber(activeDealers, 0);
        summary.inactiveDealers = Math.max(0, summary.totalDealers - summary.activeDealers);
        summary.approvedDealers = toNumber(approvedDealers, 0);
        summary.pendingDealers = toNumber(pendingDealers, 0);
        summary.rejectedDealers = toNumber(rejectedDealers, 0);
        summary.blockedDealers = toNumber(blockedDealers, 0);
        summary.totalOrders = toNumber(totalOrders, 0);
        summary.paidOrders = toNumber(paidOrders, 0);
        summary.placedOrders = toNumber(placedOrders, 0);
        summary.totalSales = toNumber(totalSalesAgg?.[0]?.totalSales, 0);
        summary.totalAccountsLoggedIn =
          toNumber(usersLoggedIn, 0) +
          toNumber(dealersLoggedIn, 0) +
          toNumber(adminsLoggedIn, 0);
        summary.recentLogins24h =
          toNumber(usersLogins24h, 0) +
          toNumber(dealersLogins24h, 0) +
          toNumber(adminsLogins24h, 0);
        summary.activeLoginsNow =
          toNumber(usersActiveNow, 0) +
          toNumber(dealersActiveNow, 0) +
          toNumber(adminsActiveNow, 0);
        summary.recentUsers = Array.isArray(recentUsers)
          ? recentUsers.map(formatSummaryUser)
          : [];
        summary.recentDealers = Array.isArray(recentDealers)
          ? recentDealers.map(formatSummaryDealer)
          : [];
        summary.recentOrders = Array.isArray(recentOrders)
          ? recentOrders.map(formatSummaryOrder)
          : [];

        summary.monthlyRevenue = monthLabels.map((label, index) => {
          const monthNumber = index + 1;
          const row = Array.isArray(monthlyRevenueAgg)
            ? monthlyRevenueAgg.find((item) => toNumber(item?._id, 0) === monthNumber)
            : null;
          return {
            label,
            revenue: toNumber(row?.revenue, 0),
            orders: toNumber(row?.orders, 0),
          };
        });
        summary.yearlyRevenue = Array.from({ length: currentYear - startYear + 1 }, (_, offset) => {
          const year = startYear + offset;
          const row = Array.isArray(yearlyRevenueAgg)
            ? yearlyRevenueAgg.find((item) => toNumber(item?._id, 0) === year)
            : null;
          return {
            label: String(year),
            revenue: toNumber(row?.revenue, 0),
            orders: toNumber(row?.orders, 0),
          };
        });
      } catch (mainError) {
        summary.mainDbConnected = false;
        summary.mainDbError = isTimeoutLikeError(mainError)
          ? "Main database timeout while loading dashboard details."
          : String(mainError?.message || "Failed to load dashboard details from main database.");
      }
    }

    return res.json(summary);
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Admin database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to fetch summary" });
  }
});

router.get("/dealers", requireAdminDb, adminAuth, requireMainDb, async (_req, res) => {
  try {
    const dealers = await withTimeout(
      Dealer.find().sort({ createdAt: -1, _id: -1 }).select("-password").lean(),
      ADMIN_QUERY_TIMEOUT_MS,
      "Dealers fetch"
    );
    return res.json({
      dealers: Array.isArray(dealers) ? dealers.map(formatSummaryDealer) : [],
    });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Main database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to fetch dealers" });
  }
});

router.post("/dealers", requireAdminDb, adminAuth, requireMainDb, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = sanitizeEmail(req.body?.email);
    const passwordRaw = String(req.body?.password || "");
    const company = String(req.body?.company || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const approvalStatusInput = String(req.body?.approvalStatus || "approved").trim().toLowerCase();
    const commissionRate = Math.max(0, Math.min(100, toNumber(req.body?.commissionRate, 5)));
    const totalSales = Math.max(0, toNumber(req.body?.totalSales, 0));
    const totalOrders = Math.max(0, Math.round(toNumber(req.body?.totalOrders, 0)));

    if (!name || !email || !passwordRaw) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (passwordRaw.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    if (!isValidDealerApprovalStatus(approvalStatusInput)) {
      return res.status(400).json({ message: "approvalStatus must be pending, approved or rejected" });
    }

    const existing = await withTimeout(
      Dealer.findOne({ email }),
      ADMIN_QUERY_TIMEOUT_MS,
      "Dealer existence check"
    );
    if (existing) {
      return res.status(409).json({ message: "Dealer email already exists" });
    }

    const password = await bcrypt.hash(passwordRaw, 10);
    const dealer = await withTimeout(
      Dealer.create({
        name,
        email,
        password,
        company,
        phone,
        isActive: true,
        approvalStatus: approvalStatusInput,
        isBlocked: false,
        totalSales,
        totalOrders,
        commissionRate,
      }),
      ADMIN_QUERY_TIMEOUT_MS,
      "Dealer create"
    );

    return res.status(201).json({
      message: "Dealer added successfully",
      dealer: formatSummaryDealer(dealer),
    });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Main database timeout. Please retry." });
    }
    if (e?.code === 11000 || e?.code === 11001) {
      return res.status(409).json({ message: "Dealer email already exists" });
    }
    return res.status(500).json({ message: e?.message || "Failed to add dealer" });
  }
});

router.patch("/dealers/:id/approval", requireAdminDb, adminAuth, requireMainDb, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid dealer id" });
    }
    const approvalStatus = String(req.body?.approvalStatus || "").trim().toLowerCase();
    if (!isValidDealerApprovalStatus(approvalStatus)) {
      return res.status(400).json({ message: "approvalStatus must be pending, approved or rejected" });
    }

    const dealer = await withTimeout(
      Dealer.findByIdAndUpdate(
        id,
        { $set: { approvalStatus } },
        { new: true, runValidators: true }
      ).select("-password"),
      ADMIN_QUERY_TIMEOUT_MS,
      "Dealer approval update"
    );

    if (!dealer) return res.status(404).json({ message: "Dealer not found" });
    return res.json({
      message: `Dealer marked as ${approvalStatus}`,
      dealer: formatSummaryDealer(dealer),
    });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Main database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to update dealer approval" });
  }
});

router.patch("/dealers/:id/block", requireAdminDb, adminAuth, requireMainDb, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid dealer id" });
    }
    const isBlocked = Boolean(req.body?.isBlocked);

    const dealer = await withTimeout(
      Dealer.findByIdAndUpdate(
        id,
        { $set: { isBlocked } },
        { new: true, runValidators: true }
      ).select("-password"),
      ADMIN_QUERY_TIMEOUT_MS,
      "Dealer block update"
    );

    if (!dealer) return res.status(404).json({ message: "Dealer not found" });
    return res.json({
      message: isBlocked ? "Dealer blocked" : "Dealer unblocked",
      dealer: formatSummaryDealer(dealer),
    });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Main database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to update dealer block status" });
  }
});

router.patch("/dealers/:id/commission", requireAdminDb, adminAuth, requireMainDb, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid dealer id" });
    }
    const commissionRate = toNumber(req.body?.commissionRate, NaN);
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({ message: "commissionRate must be between 0 and 100" });
    }

    const dealer = await withTimeout(
      Dealer.findByIdAndUpdate(
        id,
        { $set: { commissionRate } },
        { new: true, runValidators: true }
      ).select("-password"),
      ADMIN_QUERY_TIMEOUT_MS,
      "Dealer commission update"
    );

    if (!dealer) return res.status(404).json({ message: "Dealer not found" });
    return res.json({
      message: "Dealer commission updated",
      dealer: formatSummaryDealer(dealer),
    });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Main database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to update dealer commission" });
  }
});

router.patch("/dealers/:id/sales", requireAdminDb, adminAuth, requireMainDb, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid dealer id" });
    }
    const totalSales = Math.max(0, toNumber(req.body?.totalSales, NaN));
    const totalOrders = Math.max(0, Math.round(toNumber(req.body?.totalOrders, NaN)));
    if (!Number.isFinite(totalSales) || !Number.isFinite(totalOrders)) {
      return res.status(400).json({ message: "totalSales and totalOrders are required" });
    }

    const dealer = await withTimeout(
      Dealer.findByIdAndUpdate(
        id,
        { $set: { totalSales, totalOrders } },
        { new: true, runValidators: true }
      ).select("-password"),
      ADMIN_QUERY_TIMEOUT_MS,
      "Dealer sales update"
    );

    if (!dealer) return res.status(404).json({ message: "Dealer not found" });
    return res.json({
      message: "Dealer sales updated",
      dealer: formatSummaryDealer(dealer),
    });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Main database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to update dealer sales" });
  }
});

router.post("/products", requireAdminDb, adminAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const brand = String(req.body?.brand || "").trim();
    const category = String(req.body?.category || "All Phones").trim();
    const image = normalizeProductImage(req.body?.image);
    const description = String(req.body?.description || "").trim();
    const specsInput = req.body?.specs;
    const specs = Array.isArray(specsInput)
      ? specsInput.map((s) => String(s || "").trim()).filter(Boolean)
      : String(specsInput || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const price = toNumber(req.body?.price, 0);
    const originalPrice = toNumber(req.body?.originalPrice || req.body?.price, price);
    const stock = Math.max(0, Math.round(toNumber(req.body?.stock, 0)));
    const rating = Math.max(0, Math.min(5, toNumber(req.body?.rating, 4.5)));
    const reviews = Math.max(0, Math.round(toNumber(req.body?.reviews, 0)));

    if (!name || !brand || !image) {
      return res
        .status(400)
        .json({ message: "Name, brand and valid image are required" });
    }
    if (price <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    const product = await withTimeout(
      AdminProduct.create({
        productId: await getNextProductId(),
        name,
        brand,
        category,
        image,
        description,
        specs,
        price,
        originalPrice: Math.max(originalPrice, price),
        stock,
        rating,
        reviews,
        active: true,
      }),
      ADMIN_QUERY_TIMEOUT_MS,
      "Product create"
    );

    return res.status(201).json({
      message: "Product added",
      product: formatProductForClient(product),
    });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Admin database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to add product" });
  }
});

router.delete("/products/:id", requireAdminDb, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const removed = await withTimeout(
      AdminProduct.findByIdAndDelete(id),
      ADMIN_QUERY_TIMEOUT_MS,
      "Product remove"
    );
    if (!removed) return res.status(404).json({ message: "Product not found" });
    return res.json({ message: "Product removed", id });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Admin database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to remove product" });
  }
});

router.get("/public-products", async (_req, res) => {
  try {
    if (!isAdminDbReady()) {
      return res.json({ products: [] });
    }
    const products = await withTimeout(
      AdminProduct.find({ active: true }).sort({ createdAt: -1 }),
      ADMIN_QUERY_TIMEOUT_MS,
      "Public products fetch"
    );
    return res.json({ products: products.map(formatPublicProduct) });
  } catch (e) {
    if (isTimeoutLikeError(e)) {
      return res.status(503).json({ message: "Admin database timeout. Please retry." });
    }
    return res.status(500).json({ message: e?.message || "Failed to load products" });
  }
});

// ==================== SUPPORT CHAT (ADMIN ↔ USER) ====================
function toSupportPreview(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
}

function sanitizeSupportText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > 1200 ? text.slice(0, 1200) : text;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/support/chats", requireAdminDb, adminAuth, requireMainDb, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 80;
    const status = String(req.query.status || "open").trim().toLowerCase();
    const q = String(req.query.q || "").trim();

    const filter = {};
    if (status === "open" || status === "closed") filter.status = status;
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ userEmail: pattern }, { userName: pattern }];
    }

    const [chats, totals] = await Promise.all([
      SupportChat.find(filter)
        .sort({ unreadForAdmin: -1, lastMessageAt: -1 })
        .limit(limit)
        .select("userId userName userEmail status unreadForAdmin lastMessageAt lastMessagePreview"),
      SupportChat.aggregate([
        { $match: filter },
        { $group: { _id: null, totalUnreadForAdmin: { $sum: "$unreadForAdmin" } } },
      ]),
    ]);

    const totalUnreadForAdmin = Number(totals?.[0]?.totalUnreadForAdmin || 0);
    return res.json({
      totalUnreadForAdmin,
      chats: (Array.isArray(chats) ? chats : []).map((chat) => ({
        id: chat._id,
        userId: chat.userId,
        userName: chat.userName,
        userEmail: chat.userEmail,
        status: chat.status,
        unreadForAdmin: chat.unreadForAdmin,
        lastMessageAt: chat.lastMessageAt,
        lastMessagePreview: chat.lastMessagePreview,
      })),
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to load support chats" });
  }
});

router.get("/support/chats/:userId", requireAdminDb, adminAuth, requireMainDb, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(300, limitRaw)) : 200;

    const chat = await SupportChat.findOneAndUpdate(
      { userId },
      { $set: { unreadForAdmin: 0 } },
      { new: true }
    );
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const messages = Array.isArray(chat.messages) ? chat.messages.slice(-limit) : [];
    return res.json({
      chat: {
        id: chat._id,
        userId: chat.userId,
        userName: chat.userName,
        userEmail: chat.userEmail,
        status: chat.status,
        unreadForAdmin: chat.unreadForAdmin,
        unreadForUser: chat.unreadForUser,
        lastMessageAt: chat.lastMessageAt,
        messages,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to load chat" });
  }
});

router.post("/support/chats/:userId/message", requireAdminDb, adminAuth, requireMainDb, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const text = sanitizeSupportText(req.body?.text);
    if (!text) return res.status(400).json({ message: "Message text is required" });

    const now = new Date();
    const message = {
      senderType: "admin",
      senderId: String(req.admin?.adminId || ""),
      senderName: "Admin",
      text,
      createdAt: now,
    };

    const chat = await SupportChat.findOneAndUpdate(
      { userId },
      {
        $set: {
          status: "open",
          lastMessageAt: now,
          lastMessagePreview: toSupportPreview(text),
        },
        $inc: { unreadForUser: 1 },
        $push: { messages: { $each: [message], $slice: -200 } },
      },
      { new: true }
    );

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const messages = Array.isArray(chat.messages) ? chat.messages.slice(-200) : [];
    return res.json({
      chat: {
        id: chat._id,
        userId: chat.userId,
        userName: chat.userName,
        userEmail: chat.userEmail,
        status: chat.status,
        unreadForAdmin: chat.unreadForAdmin,
        unreadForUser: chat.unreadForUser,
        lastMessageAt: chat.lastMessageAt,
        messages,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to send message" });
  }
});

router.patch("/support/chats/:userId/status", requireAdminDb, adminAuth, requireMainDb, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const status = String(req.body?.status || "").trim().toLowerCase();
    if (status !== "open" && status !== "closed") {
      return res.status(400).json({ message: "Invalid status" });
    }

    const chat = await SupportChat.findOneAndUpdate(
      { userId },
      { $set: { status } },
      { new: true }
    ).select("userId userName userEmail status unreadForAdmin unreadForUser lastMessageAt lastMessagePreview");

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    return res.json({
      chat: {
        id: chat._id,
        userId: chat.userId,
        userName: chat.userName,
        userEmail: chat.userEmail,
        status: chat.status,
        unreadForAdmin: chat.unreadForAdmin,
        unreadForUser: chat.unreadForUser,
        lastMessageAt: chat.lastMessageAt,
        lastMessagePreview: chat.lastMessagePreview,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Failed to update status" });
  }
});

module.exports = router;
