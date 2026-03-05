const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("./auth");

function adminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing Authorization Bearer token" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.role !== "admin" || !payload.adminId) {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.admin = payload;
    return next();
  } catch (_e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { adminAuth };

