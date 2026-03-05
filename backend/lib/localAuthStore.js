const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILE_PATH = path.join(DATA_DIR, "local-users.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify({ users: [] }, null, 2), "utf8");
  }
}

function readStore() {
  ensureDataFile();
  const raw = fs.readFileSync(FILE_PATH, "utf8");
  return JSON.parse(raw || "{\"users\":[]}");
}

function writeStore(store) {
  ensureDataFile();
  fs.writeFileSync(FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function findUserByEmail(email) {
  const store = readStore();
  return (store.users || []).find((u) => u.email === email) || null;
}

function createUser({ fullName, email, password }) {
  const store = readStore();
  const users = store.users || [];
  if (users.some((u) => u.email === email)) {
    const error = new Error("Email already registered");
    error.code = "EMAIL_EXISTS";
    throw error;
  }

  const user = {
    id: `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    fullName,
    email,
    password,
    phoneNumber: "",
    cart: [],
    wishlist: [],
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeStore({ users });
  return user;
}

module.exports = {
  findUserByEmail,
  createUser,
};
