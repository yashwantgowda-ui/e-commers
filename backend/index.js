const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// ensure Node uses a reliable DNS resolver for SRV lookups (Atlas uses DNS SRV records)
// some routers/ISPs refuse SRV queries which results in ECONNREFUSED when mongoose
// tries to resolve the cluster.  Override the servers here so the lookup succeeds.
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


dotenv.config();

const PORT = Number(process.env.PORT) || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ecomm";
const NODE_ENV = process.env.NODE_ENV || "development";
const MONGO_RECONNECT_MS = 5000;

const app = express();
let dbStatus = {
  connected: false,
  readyState: mongoose.connection.readyState,
  lastError: "",
};
let mongoReconnectTimer = null;
let mongoConnectInFlight = false;

function redactMongoUri(uri) {
  const value = String(uri || "");
  return value.replace(/(mongodb(\+srv)?:\/\/[^:/]+:)([^@]*)(@)/i, "$1***$4");
}

function updateDbStatus(next = {}) {
  dbStatus = {
    ...dbStatus,
    readyState: mongoose.connection.readyState,
    ...next,
  };
}

async function connectMongo() {
  if (mongoConnectInFlight) return;
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;

  mongoConnectInFlight = true;
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    updateDbStatus({ connected: true, lastError: "" });
    console.log(`MongoDB connected: ${redactMongoUri(MONGO_URI)}`);
  } catch (err) {
    updateDbStatus({ connected: false, lastError: err.message || "Mongo error" });
    console.error("MongoDB connect failed:", err.message || err);
    console.error("Backend will keep running; DB-backed endpoints may fail until DB is available.");
    scheduleMongoReconnect();
  } finally {
    mongoConnectInFlight = false;
  }
}

function scheduleMongoReconnect(delayMs = MONGO_RECONNECT_MS) {
  if (mongoReconnectTimer) return;
  mongoReconnectTimer = setTimeout(() => {
    mongoReconnectTimer = null;
    connectMongo();
  }, delayMs);
  if (typeof mongoReconnectTimer.unref === "function") {
    mongoReconnectTimer.unref();
  }
}

mongoose.connection.on("connected", () => {
  if (mongoReconnectTimer) {
    clearTimeout(mongoReconnectTimer);
    mongoReconnectTimer = null;
  }
  updateDbStatus({ connected: true, lastError: "" });
});

mongoose.connection.on("disconnected", () => {
  updateDbStatus({ connected: false });
  console.warn("MongoDB disconnected");
  scheduleMongoReconnect();
});

mongoose.connection.on("error", (err) => {
  updateDbStatus({ connected: false, lastError: err.message || "Mongo error" });
  console.error("MongoDB error:", err.message || err);
  scheduleMongoReconnect();
});

let userRoutes;
try {
  userRoutes = require("./routes/userRoutes");
} catch (err) {
  console.error("Failed to load routes:", err);
  process.exit(1);
}

let adminRoutes;
try {
  adminRoutes = require("./routes/adminRoutes");
} catch (err) {
  console.error("Failed to load admin routes:", err);
  process.exit(1);
}

let dealerRoutes;
try {
  dealerRoutes = require("./routes/dealerRoutes");
} catch (err) {
  console.error("Failed to load dealer routes:", err);
  process.exit(1);
}

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()) : true,
    credentials: true,
  })
);
// Allow base64 image payloads from admin drag/drop paste uploads.
app.use(express.json({ limit: "6mb" }));

app.get("/", (_req, res) => {
  res.json({
    message: "E-comm backend is running",
    env: NODE_ENV,
    endpoints: ["GET /", "GET /health", "GET /api", "GET /api/test"],
  });
});

app.get("/health", (_req, res) => {
  const readyState = mongoose.connection.readyState;
  const dbConnected = readyState === 1;
  const httpStatus = dbConnected ? 200 : 503;

  res.status(httpStatus).json({
    ok: dbConnected,
    service: "backend",
    db: {
      connected: dbConnected,
      readyState,
      lastError: dbStatus.lastError || "",
    },
    uptimeSec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/admin", adminRoutes);
app.use("/api/dealer", dealerRoutes);
app.use("/api", userRoutes);
app.use("/admin", adminRoutes);
app.use("/dealer", dealerRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    method: req.method,
    url: req.originalUrl,
  });
});

app.use((err, req, res, _next) => {
  console.error("Unhandled API error:", err);
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ message });
});

function startServer(attemptPort) {
  const server = app.listen(attemptPort, "0.0.0.0", () => {
    console.log(`Backend listening on http://127.0.0.1:${attemptPort}`);
    console.log(`Health check: http://127.0.0.1:${attemptPort}/health`);
    console.log(`API root: http://127.0.0.1:${attemptPort}/api`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      const nextPort = attemptPort + 1;
      console.warn(`Port ${attemptPort} is in use. Trying port ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
}

startServer(PORT);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

connectMongo();
