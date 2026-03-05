const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("./auth");

function dealerAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing Authorization Bearer token" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.role !== "dealer" || !payload.dealerId) {
      return res.status(403).json({ message: "Dealer access required" });
    }
    req.dealer = payload;
    return next();
  } catch (_e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { dealerAuth };

