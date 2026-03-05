const mongoose = require("mongoose");

const ADMIN_MONGO_URI =
  process.env.ADMIN_MONGO_URI || "mongodb://127.0.0.1:27017/ecomm_admin";

let adminConnection;
let initialized = false;
let adminStatus = {
  connected: false,
  readyState: 0,
  lastError: "",
};

function redactMongoUri(uri) {
  const value = String(uri || "");
  return value.replace(/(mongodb(\+srv)?:\/\/[^:/]+:)([^@]*)(@)/i, "$1***$4");
}

function updateAdminStatus(next = {}) {
  adminStatus = {
    ...adminStatus,
    readyState: adminConnection ? adminConnection.readyState : 0,
    ...next,
  };
}

function initAdminConnection() {
  if (initialized) return;
  initialized = true;
  adminConnection = mongoose.createConnection(ADMIN_MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 5000,
    bufferCommands: false,
  });

  adminConnection.on("connected", () => {
    updateAdminStatus({ connected: true, lastError: "" });
    console.log(`Admin DB connected: ${redactMongoUri(ADMIN_MONGO_URI)}`);
  });

  adminConnection.on("disconnected", () => {
    updateAdminStatus({ connected: false });
    console.warn("Admin DB disconnected");
  });

  adminConnection.on("error", (err) => {
    updateAdminStatus({
      connected: false,
      lastError: err?.message || "Admin DB error",
    });
    console.error("Admin DB error:", err?.message || err);
  });
}

function getAdminConnection() {
  initAdminConnection();
  return adminConnection;
}

function getAdminDbStatus() {
  initAdminConnection();
  return {
    connected: adminStatus.connected,
    readyState: adminConnection ? adminConnection.readyState : 0,
    lastError: adminStatus.lastError,
  };
}

module.exports = {
  getAdminConnection,
  getAdminDbStatus,
};
