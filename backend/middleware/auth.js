const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret_key"
    );
    const user = await User.findById(decoded.userId)
      .select("-password")
      .populate("assignedClass");

    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ message: "Invalid token or inactive user." });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Admin privileges required." });
  }
  next();
};

// Middleware to check if user can access specific class
const classAccess = async (req, res, next) => {
  try {
    const { classId } = req.params;

    // Admin can access any class
    if (req.user.role === "admin") {
      return next();
    }

    // Servant can only access their assigned class
    if (req.user.role === "servant") {
      if (
        !req.user.assignedClass ||
        !classId ||
        req.user.assignedClass._id?.toString() !== classId
      ) {
        return res.status(403).json({
          message: "Access denied. You can only access your assigned class.",
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Server error checking class access." });
  }
};

module.exports = {
  authMiddleware,
  adminOnly,
  classAccess,
};
