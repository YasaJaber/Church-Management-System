const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Import routes
const authRoutes = require("./routes/auth");
const childRoutes = require("./routes/children");
const classRoutes = require("./routes/classes");
const attendanceRoutes = require("./routes/attendance");
const statisticsRoutes = require("./routes/statistics");
const servantsRoutes = require("./routes/servants");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
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
  res.json({ message: "Mar Gerges Church Attendance API Server" });
});

// MongoDB connection
// For production, set MONGODB_URI environment variable
// For development, you can use MongoDB Atlas (cloud) or local MongoDB
const MONGODB_URI =
  "mongodb+srv://yasamasry:Yasa_jaber12345@marygerges.f7mwc5q.mongodb.net/margerges_church?retryWrites=true&w=majority&appName=maryGerges";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
    console.log(`📊 Database: ${MONGODB_URI}`);
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on("disconnected", () => {
  console.log("📤 Disconnected from MongoDB");
});

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB error:", error);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API available at: http://localhost:${PORT}`);
});
