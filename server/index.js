require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const fragmentRoutes = require("./routes/fragments");

const app = express();
const PORT = 5001;

// FIXED PART 5: CORS restricted to trusted origin only
// FIXED PART 1: Uses environment variables loaded by dotenv
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/fragments", fragmentRoutes);

app.get("/", (req, res) => {
  res.send("Fragments API Running (Secured)");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
