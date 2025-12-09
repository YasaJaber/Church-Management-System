const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const compression = require("compression");
require("dotenv").config();

// Import utilities
const logger = require('./utils/logger');
const httpLogger = require('./middleware/httpLogger');
const helmetConfig = require('./middleware/helmet.config');

// Import rate limiters
const { generalLimiter, authLimiter, apiLimiter, speedLimiter } = require('./middleware/rateLimiter');

const app = express();

// Apply Helmet security headers (must be before other middleware)
app.use(helmetConfig);

// Apply compression for all responses (60-80% size reduction)
app.use(compression({
  // Compress responses larger than 1KB
  threshold: 1024,
  // Compression level (1-9, higher = more compression but slower)
  level: 6,
  // Filter function to decide which responses to compress
  filter: (req, res) => {
    // Don't compress if client doesn't accept it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression's default filter (compresses text-based content)
    return compression.filter(req, res);
  }
}));

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

// Apply rate limiting
app.use(generalLimiter);
app.use(speedLimiter);

// Apply HTTP logging (secure logging)
app.use(httpLogger);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "Church Management System API is running!" });
});

// Simple test route
app.get("/test", (req, res) => {
  logger.debug("Test endpoint called");
  res.json({ success: true, message: "Test working!" });
});

// Advanced statistics test route
app.get("/api/advanced-statistics/test", (req, res) => {
  res.json({
    success: true,
    message: "Advanced statistics working!",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
// Apply strict rate limiting to auth routes (protection against brute force)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth", require("./routes/auth"));

// Apply API rate limiter to all API routes
app.use("/api", apiLimiter);

app.use("/api/classes", require("./routes/classes"));
app.use("/api/children", require("./routes/children"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/servants", require("./routes/servants"));
app.use("/api/servants-attendance", require("./routes/servants-attendance"));
app.use("/api/pastoral-care", require("./routes/pastoral-care"));
app.use("/api/statistics", require("./routes/statistics-fresh"));
app.use("/api/advanced-statistics", require("./routes/advanced-statistics"));
app.use("/api/audit-logs", require("./routes/audit-logs"));

logger.info("Routes registered successfully");

// Error Handling Middleware (must be AFTER all routes)
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Connect to MongoDB first, then start the server
async function startServer() {
  try {
    logger.info("Connecting to MongoDB...");
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/church_management",
      {
        serverSelectionTimeoutMS: 15000, // 15 seconds timeout
        heartbeatFrequencyMS: 2000,
      }
    );
    logger.info("Connected to MongoDB successfully");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error("MongoDB connection error", { error: error.message });
    process.exit(1);
  }
}

startServer();

module.exports = app;
