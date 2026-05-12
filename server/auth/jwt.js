const jwt = require("jsonwebtoken");

// FIXED PART 1: Secret from environment variable
const SECRET = process.env.JWT_SECRET;

// Validate that JWT_SECRET is configured at startup
if (!SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is not set. Please configure it in .env file.",
  );
}

const signToken = (payload) => {
  // FIXED PART 1: Added 1-hour expiry
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
};

const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

module.exports = { signToken, verifyToken, SECRET };
