const { verifyToken } = require("../auth/jwt");
const { blacklist } = require("../data/store");

const auth = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const tokenValue = token.split(" ")[1];

    // FIXED PART 6: Check if token is blacklisted (logged out)
    if (blacklist.has(tokenValue)) {
      return res.status(401).json({ error: "Token has been revoked" });
    }

    const decoded = verifyToken(tokenValue);
    req.user = decoded; // FIXED PART 2: req.user.role now contains the role from JWT
    next();
  } catch (err) {
    res.status(401).json({ error: "Auth failed" });
  }
};

module.exports = auth;
