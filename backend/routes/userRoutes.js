const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Order = require("../models/Order");
const SupportChat = require("../models/SupportChat");
const mongoose = require("mongoose");
const { findUserByEmail, createUser } = require("../lib/localAuthStore");
const jwt = require("jsonwebtoken");
const { auth, getJwtSecret } = require("../middleware/auth");
const Razorpay = require("razorpay");
const crypto = require("crypto");

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

// Lazy initialization of Razorpay (only when needed and env vars are available)
function getRazorpayInstance() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys not configured in environment variables");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function signToken(user) {
  const userId = (user._id || user.id || "").toString();
  return jwt.sign(
    { userId, email: user.email },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

function sanitizeCartItem(raw) {
  const productId = Number(raw.productId ?? raw.id);
  return {
    productId,
    name: String(raw.name || ""),
    brand: String(raw.brand || ""),
    image: String(raw.image || ""),
    price: Number(raw.price || 0),
    quantity: Math.max(1, Number(raw.quantity || 1)),
  };
}

function sanitizeWishlistItem(raw) {
  const productId = Number(raw.productId ?? raw.id);
  return {
    productId,
    name: String(raw.name || ""),
    brand: String(raw.brand || ""),
    image: String(raw.image || ""),
    price: Number(raw.price || 0),
  };
}

// API root - shows available endpoints
router.get("/", (req, res) => {
  res.json({
    message: "API endpoints",
    version: "1.0",
    endpoints: {
      test: "GET  /api/test - Test endpoint",
      users: "GET  /api/users - List all users (for testing)",
      register: "POST /api/register - Register new user",
      login: "POST /api/login - Login user",
      addUser: "POST /api/add-user - Add user details",
      chatbot: "POST /api/chatbot - FAQ assistant (requires login)",
      supportChat: "GET  /api/support/chat - View support chat (requires login)",
      supportMessage: "POST /api/support/chat/message - Send support message (requires login)",
      supportRead: "POST /api/support/chat/mark-read - Mark support messages read (requires login)",
    },
    example: {
      register: {
        url: "/api/register",
        method: "POST",
        body: {
          username: "string",
          email: "string",
          password: "string",
        },
      },
      login: {
        url: "/api/login",
        method: "POST",
        body: {
          email: "string",
          password: "string",
        },
      },
    },
  });
});

// Test endpoint: GET /api/test
router.get("/test", (req, res) => {
  res.json({
    message: "Backend is working!",
    routes: "Routes are registered",
    source: "userRoutes.js",
  });
});

// Get all users - for testing/verification
router.get("/users", requireDb, async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Don't send passwords
    res.json({
      count: users.length,
      users: users,
      database: "ecomm",
      collection: "users",
    });
  } catch (error) {
    console.error("Get users ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Save User (e.g. from Myproduct form)
router.post("/add-user", requireDb, async (req, res) => {
  try {
    const { fullName, phoneNumber, email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!fullName || !normalizedEmail) {
      return res.status(400).json({ message: "fullName and email are required" });
    }

    const newUser = new User({
      fullName,
      phoneNumber: phoneNumber || "",
      email: normalizedEmail,
    });

    const savedUser = await newUser.save();
    console.log("âœ… User saved:", savedUser.email, "to database 'ecomm', collection 'users'");

    res.status(201).json({
      message: "User details saved successfully",
      userId: savedUser._id || savedUser.id,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Email already exists" });
    }
    console.log("ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Register (from Register form - stored in database)
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!username || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Username, email and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let savedUser;
    if (isDbConnected()) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const newUser = new User({
        fullName: username,
        email: normalizedEmail,
        password: hashedPassword,
        phoneNumber: "",
      });
      savedUser = await newUser.save();
    } else {
      savedUser = createUser({
        fullName: username,
        email: normalizedEmail,
        password: hashedPassword,
      });
    }
    console.log("âœ… User registered:", savedUser.email, "to database 'ecomm', collection 'users'");

    res.status(201).json({
      message: "Registration successful",
      userId: savedUser._id || savedUser.id,
      token: signToken(savedUser),
      user: {
        id: savedUser._id || savedUser.id,
        name: savedUser.fullName,
        email: savedUser.email,
      },
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: "Email already registered" });
    }
    console.log("ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Login (validate email and password against database)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Validate email format
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = isDbConnected() ? await User.findOne({ email: normalizedEmail }) : findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Users from add-user may not have password set; only registered users have hashed password
    if (!user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (isDbConnected() && user?._id) {
      const loginTime = new Date();
      user.lastLoginAt = loginTime;
      try {
        await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: loginTime } });
      } catch (_e) {
        // Login should still succeed if last-login update fails.
      }
    }

    res.status(200).json({
      message: "Login successful",
      token: signToken(user),
      user: {
        id: user._id || user.id,
        name: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login ERROR:", error);
    res.status(500).json({ 
      message: error.message || "Internal server error during login" 
    });
  }
});

// ==================== AUTH USER DATA ====================
router.get("/me", auth, requireDb, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// ==================== CART ====================
router.get("/cart", auth, requireDb, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("cart");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ items: user.cart || [] });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

router.put("/cart", auth, requireDb, async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const sanitized = items
      .map(sanitizeCartItem)
      .filter((i) => Number.isFinite(i.productId) && i.productId > 0 && i.name && i.price >= 0);

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { cart: sanitized },
      { new: true, select: "cart email" }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    console.log(`âœ… Cart saved for ${user.email}: ${sanitized.length} items`);
    return res.json({ items: user.cart || [] });
  } catch (e) {
    console.error("âŒ Cart save error:", e);
    return res.status(500).json({ message: e.message });
  }
});

// ==================== WISHLIST ====================
router.get("/wishlist", auth, requireDb, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("wishlist");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ items: user.wishlist || [] });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

router.put("/wishlist", auth, requireDb, async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const sanitized = items
      .map(sanitizeWishlistItem)
      .filter((i) => Number.isFinite(i.productId) && i.productId > 0 && i.name && i.price >= 0);

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { wishlist: sanitized },
      { new: true, select: "wishlist email" }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    console.log(`âœ… Wishlist saved for ${user.email}: ${sanitized.length} items`);
    return res.json({ items: user.wishlist || [] });
  } catch (e) {
    console.error("âŒ Wishlist save error:", e);
    return res.status(500).json({ message: e.message });
  }
});

// ==================== CHECKOUT / PAYMENT (ORDER) ====================
router.post("/checkout", auth, requireDb, async (req, res) => {
  try {
    const { phone, address, paymentMethod, upiId, cardLast4 } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.cart || user.cart.length === 0) return res.status(400).json({ message: "Cart is empty" });

    const items = user.cart.map((i) => ({
      productId: i.productId,
      name: i.name,
      brand: i.brand,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingFee = subtotal > 0 ? 99 : 0;
    const platformFee = subtotal > 0 ? 10 : 0;
    const total = subtotal + shippingFee + platformFee;

    const method = paymentMethod;
    if (!["upi", "card", "cod", "razorpay"].includes(method)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      return res.status(400).json({ message: "Invalid phone" });
    }
    if (!address || String(address).trim().length < 6) {
      return res.status(400).json({ message: "Invalid address" });
    }

    const payment = {
      method,
      upiId: method === "upi" ? String(upiId || "") : "",
      cardLast4: method === "card" ? String(cardLast4 || "") : "",
    };

    const order = await Order.create({
      userId: user._id,
      phone: String(phone),
      address: String(address),
      items,
      subtotal,
      shippingFee,
      platformFee,
      total,
      payment,
      status: method === "cod" ? "placed" : "paid",
    });

    // Clear cart after successful order
    user.cart = [];
    await user.save();

    return res.status(201).json({
      message: "Order created",
      orderId: order._id,
      total,
      status: order.status,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

router.get("/orders", auth, requireDb, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(25);
    return res.json({ orders });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// ==================== RAZORPAY PAYMENT ====================
// Create Razorpay order
router.post("/razorpay/create-order", auth, requireDb, async (req, res) => {
  try {
    const razorpayInstance = getRazorpayInstance();
    
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.cart || user.cart.length === 0) return res.status(400).json({ message: "Cart is empty" });

    const items = user.cart.map((i) => ({
      productId: i.productId,
      name: i.name,
      brand: i.brand,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingFee = subtotal > 0 ? 99 : 0;
    const platformFee = subtotal > 0 ? 10 : 0;
    const total = subtotal + shippingFee + platformFee;

    const options = {
      amount: Math.round(total * 100), // Razorpay expects amount in paise (multiply by 100)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        email: user.email,
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    return res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error("Razorpay order creation error:", e);
    return res.status(500).json({ message: e.message || "Failed to create Razorpay order" });
  }
});

// Verify Razorpay payment and create order
router.post("/razorpay/verify-payment", auth, requireDb, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, phone, address } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      return res.status(400).json({ message: "Invalid phone" });
    }
    if (!address || String(address).trim().length < 6) {
      return res.status(400).json({ message: "Invalid address" });
    }

    // Verify signature
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: "Razorpay secret is not configured" });
    }

    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.cart || user.cart.length === 0) return res.status(400).json({ message: "Cart is empty" });

    const items = user.cart.map((i) => ({
      productId: i.productId,
      name: i.name,
      brand: i.brand,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingFee = subtotal > 0 ? 99 : 0;
    const platformFee = subtotal > 0 ? 10 : 0;
    const total = subtotal + shippingFee + platformFee;

    const payment = {
      method: "razorpay",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    };

    const order = await Order.create({
      userId: user._id,
      phone: String(phone),
      address: String(address),
      items,
      subtotal,
      shippingFee,
      platformFee,
      total,
      payment,
      status: "paid",
    });

    // Clear cart after successful order
    user.cart = [];
    await user.save();

    console.log(`âœ… Razorpay order created: ${order._id} for ${user.email}`);

    return res.status(201).json({
      message: "Payment verified and order created",
      orderId: order._id,
      total,
      status: order.status,
    });
  } catch (e) {
    console.error("Razorpay verification error:", e);
    return res.status(500).json({ message: e.message || "Payment verification failed" });
  }
});

// ==================== SUPPORT CHAT (USER ↔ ADMIN) ====================
function toSupportPreview(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
}

function sanitizeSupportText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > 1200 ? text.slice(0, 1200) : text;
}

router.get("/support/chat", auth, requireDb, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 120;

    const user = await User.findById(req.user.userId).select("fullName email");
    if (!user) return res.status(404).json({ message: "User not found" });

    let chat = await SupportChat.findOne({ userId: user._id });
    if (!chat) {
      chat = await SupportChat.create({
        userId: user._id,
        userName: String(user.fullName || ""),
        userEmail: String(user.email || ""),
        status: "open",
        unreadForAdmin: 0,
        unreadForUser: 0,
        lastMessageAt: new Date(),
        lastMessagePreview: "",
        messages: [],
      });
    } else {
      const nextName = String(user.fullName || "");
      const nextEmail = String(user.email || "");
      if ((nextName && chat.userName !== nextName) || (nextEmail && chat.userEmail !== nextEmail)) {
        chat.userName = nextName || chat.userName;
        chat.userEmail = nextEmail || chat.userEmail;
        await chat.save();
      }
    }

    const messages = Array.isArray(chat.messages) ? chat.messages.slice(-limit) : [];
    return res.json({
      chat: {
        id: chat._id,
        userId: chat.userId,
        status: chat.status,
        unreadForUser: chat.unreadForUser,
        lastMessageAt: chat.lastMessageAt,
        messages,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Failed to load support chat" });
  }
});

router.post("/support/chat/message", auth, requireDb, async (req, res) => {
  try {
    const text = sanitizeSupportText(req.body?.text);
    if (!text) return res.status(400).json({ message: "Message text is required" });

    const user = await User.findById(req.user.userId).select("fullName email");
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    const message = {
      senderType: "user",
      senderId: user._id.toString(),
      senderName: String(user.fullName || "User"),
      text,
      createdAt: now,
    };

    const chat = await SupportChat.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userName: String(user.fullName || ""),
          userEmail: String(user.email || ""),
          status: "open",
          lastMessageAt: now,
          lastMessagePreview: toSupportPreview(text),
        },
        $inc: { unreadForAdmin: 1 },
        $push: { messages: { $each: [message], $slice: -200 } },
      },
      { new: true, upsert: true }
    );

    const messages = Array.isArray(chat.messages) ? chat.messages.slice(-120) : [];
    return res.json({
      chat: {
        id: chat._id,
        userId: chat.userId,
        status: chat.status,
        unreadForUser: chat.unreadForUser,
        lastMessageAt: chat.lastMessageAt,
        messages,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Failed to send message" });
  }
});

router.post("/support/chat/mark-read", auth, requireDb, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    const chat = await SupportChat.findOneAndUpdate(
      { userId: user._id },
      { $set: { unreadForUser: 0 } },
      { new: true }
    );

    return res.json({
      chat: chat
        ? {
            id: chat._id,
            userId: chat.userId,
            status: chat.status,
            unreadForUser: chat.unreadForUser,
            lastMessageAt: chat.lastMessageAt,
          }
        : null,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Failed to mark messages read" });
  }
});

// ==================== CHATBOT (FAQ ASSISTANT) ====================
function buildChatbotReply({ message, userEmail, lastOrder }) {
  const text = String(message || "").trim();

  if (!text) {
    return {
      reply: "Tell me what you need help with (orders, delivery, return, payment, or account).",
      suggestions: ["Track my order", "Delivery time", "Return policy", "Payment help"],
    };
  }

  if (/\b(hi|hello|hey|good\s*(morning|afternoon|evening))\b/i.test(text)) {
    return {
      reply: `Hi${userEmail ? ` ${userEmail}` : ""}! I can help with orders, delivery, returns, and payments.`,
      suggestions: ["Track my order", "Delivery time", "Return policy", "Payment help"],
    };
  }

  if (/\b(order|orders|track|tracking)\b/i.test(text)) {
    if (lastOrder) {
      return {
        reply: `Your latest order is ${String(lastOrder._id)} with status \"${String(
          lastOrder.status || ""
        )}\". Total: ₹${Number(lastOrder.total || 0)}.`,
        suggestions: ["Show my orders", "Delivery time", "Return policy"],
      };
    }
    return {
      reply: "To track an order, open Profile → Orders. If you don’t see an order there, it may not be placed yet.",
      suggestions: ["Delivery time", "Return policy", "Payment help"],
    };
  }

  if (/\b(delivery|shipping|ship|deliver)\b/i.test(text)) {
    return {
      reply:
        "Delivery time depends on your location. Most orders are delivered within 3–7 business days after payment confirmation.",
      suggestions: ["Track my order", "Return policy", "Payment help"],
    };
  }

  if (/\b(return|refund|replace|replacement|cancel|cancellation)\b/i.test(text)) {
    return {
      reply:
        "Returns/replacements are supported for eligible orders. Share the issue within a few days of delivery and keep the box/accessories for faster approval.",
      suggestions: ["Talk to admin", "Track my order", "Payment help"],
    };
  }

  if (/\b(payment|upi|card|razorpay|cod)\b/i.test(text)) {
    return {
      reply:
        "Payment options: Razorpay, UPI, Card, or Cash on Delivery (COD). If a payment fails, retry once and ensure your internet is stable.",
      suggestions: ["Try Razorpay", "Try UPI", "Talk to admin"],
    };
  }

  if (/\b(login|password|account|profile)\b/i.test(text)) {
    return {
      reply:
        "For account issues, re-check your email/password, then try logging in again. You can update profile details from the Profile panel.",
      suggestions: ["Talk to admin", "Return policy", "Payment help"],
    };
  }

  if (/\b(admin|support|human|agent)\b/i.test(text)) {
    return {
      reply: "You can message the admin from the Support chat tab in your dashboard.",
      suggestions: ["Open admin chat", "Return policy", "Track my order"],
    };
  }

  return {
    reply:
      "I can help with orders, delivery, returns, payments, or account issues. Try asking: “track my order”, “delivery time”, or “return policy”.",
    suggestions: ["Track my order", "Delivery time", "Return policy", "Payment help"],
  };
}

router.post("/chatbot", auth, async (req, res) => {
  try {
    const raw = String(req.body?.message || "");
    const message = raw.length > 800 ? raw.slice(0, 800) : raw;

    const userEmail = String(req.user?.email || "");
    let lastOrder = null;

    if (isDbConnected()) {
      try {
        lastOrder = await Order.findOne({ userId: req.user.userId }).sort({ createdAt: -1 });
      } catch (_e) {
        lastOrder = null;
      }
    }

    const { reply, suggestions } = buildChatbotReply({ message, userEmail, lastOrder });
    return res.json({ reply, suggestions: Array.isArray(suggestions) ? suggestions : [] });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Chatbot error" });
  }
});

module.exports = router;

