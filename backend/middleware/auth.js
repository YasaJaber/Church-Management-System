const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware called');
    const token = req.header("Authorization")?.replace("Bearer ", "");
    console.log('🔑 Token:', token ? 'Present' : 'Missing');

    if (!token) {
      console.log('❌ No token provided');
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    console.log('🔍 Verifying token...');
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret_key"
    );
    console.log('✅ Token decoded successfully:', { userId: decoded.userId, role: decoded.role });
    
    const user = await User.findById(decoded.userId)
      .select("-password")
      .populate("assignedClass");

    console.log('👤 User found:', user ? user.name : 'Not found');
    if (!user || !user.isActive) {
      console.log('❌ Invalid token or inactive user');
      return res
        .status(401)
        .json({ message: "Invalid token or inactive user." });
    }

    req.user = { ...user.toObject(), userId: decoded.userId };
    console.log('✅ Auth middleware passed for:', user.name);
    next();
  } catch (error) {
    console.log('❌ Auth middleware error:', error.message);
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

// Middleware to check if user is admin or service leader
const adminOrServiceLeader = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "serviceLeader") {
    return res
      .status(403)
      .json({ message: "Access denied. Admin or Service Leader privileges required." });
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
  adminOrServiceLeader,
  classAccess,
};
