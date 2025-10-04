const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "https://church-management-web.onrender.com",
      "https://church-management-system-1-i51l.onrender.com", // الرابط الجديد للفرونت إند
      "https://church-management-system-six.vercel.app",
      "https://church-management-system.vercel.app",
      "https://*.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "Church Management System API is running!" });
});

// Simple test route
app.get("/test", (req, res) => {
  console.log("🧪 Simple test endpoint called");
  res.json({ success: true, message: "Test working!" });
});

// Advanced statistics test route
app.get("/api/advanced-statistics/test", (req, res) => {
  console.log("🧪 Advanced statistics test endpoint called");
  res.json({
    success: true,
    message: "Advanced statistics working!",
    timestamp: new Date().toISOString(),
  });
});

// Debug token creation endpoint
app.get("/debug/create-token", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const jwt = require("jsonwebtoken");
    const User = require("./models/User");

    const user = await User.findOne({ role: "serviceLeader" });
    if (!user) {
      return res.status(404).json({ error: "Service leader not found" });
    }

    const secret = process.env.JWT_SECRET;
    const payload = {
      id: user._id.toString(),
      role: user.role,
      username: user.username,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "7d" });

    // Test verification immediately
    const verified = jwt.verify(token, secret);

    res.json({
      success: true,
      token: token,
      payload: payload,
      verified: verified,
      secret_found: !!secret,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/classes", require("./routes/classes"));
app.use("/api/children", require("./routes/children"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/servants", require("./routes/servants"));
app.use("/api/servants-attendance", require("./routes/servants-attendance"));
app.use("/api/pastoral-care", require("./routes/pastoral-care"));
app.use("/api/statistics", require("./routes/statistics-fresh"));
app.use("/api/advanced-statistics", require("./routes/advanced-statistics"));

console.log("📍 Routes registered successfully");

// Connect to MongoDB first, then start the server
async function startServer() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/church_management",
      {
        serverSelectionTimeoutMS: 15000, // 15 seconds timeout
        heartbeatFrequencyMS: 2000,
      }
    );
    console.log("✅ Connected to MongoDB");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
