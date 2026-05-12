const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { users, blacklist } = require("../data/store");
const { signToken } = require("../auth/jwt");
const auth = require("../middleware/auth");

router.post("/signup", async (req, res) => {
  const { email, password, role } = req.body;
  if (users.find((u) => u.email === email))
    return res.status(400).json({ error: "User exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(),
    email,
    password: hashedPassword,
    role: role || "reader",
  };
  users.push(user);

  // FIXED PART 2: Role now included in JWT payload
  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // FIXED PART 2: Role now included in JWT payload
  const token = signToken({ userId: user.id, role: user.role });

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

// FIXED PART 6: Logout endpoint that invalidates the token
router.post("/logout", auth, (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (token) {
    blacklist.add(token);
  }
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
