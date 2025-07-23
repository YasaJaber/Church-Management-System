const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Import routes
const authRoutes = require("./routes/auth");
const childRoutes = require("./routes/children");
const classRoutes = require("./routes/classes");
const attendanceRoutes = require("./routes/attendance");
const statisticsRoutes = require("./routes/statistics-fresh");
const servantsRoutes = require("./routes/servants");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:8082', 'http://192.168.1.4:8082', 'http://10.0.2.2:8082', 'exp://192.168.1.4:8082', 'http://localhost:8083', 'http://192.168.1.4:8083', 'exp://192.168.1.4:8083'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming Request: ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", JSON.stringify(req.body, null, 2));
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/children", childRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/servants", servantsRoutes);

// Basic test route
app.get("/", (req, res) => {
  res.json({ message: "Mar Gerges Church Attendance API Server - Fixed Version" });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    server: "fixed-version"
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
    console.log(`📊 Database: ${process.env.MONGODB_URI.split('@')[1].split('?')[0]}`);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API available at: http://localhost:${PORT}`);
  console.log(`📱 Mobile access at: http://192.168.1.4:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  server.close(() => {
    console.log("Server closed");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received");
  server.close(async () => {
    console.log("Server closed");
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});

module.exports = app;
