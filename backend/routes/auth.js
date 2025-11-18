const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    // Find user by username and populate assigned class
    const user = await User.findOne({ username }).populate("assignedClass");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Account is not active",
      });
    }

    // Verify JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('❌ CRITICAL: JWT_SECRET is not configured');
      return res.status(500).json({
        success: false,
        error: "Server configuration error",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userResponse = {
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      assignedClass: user.assignedClass,
      phone: user.phone,
    };

    res.json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.get("/verify", authMiddleware, async (req, res) => {
  try {
    // If we reach here, token is valid (authMiddleware passed)
    const userResponse = {
      _id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      role: req.user.role,
      assignedClass: req.user.assignedClass,
      phone: req.user.phone,
    };

    res.json({
      success: true,
      data: userResponse,
      message: "Token is valid",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new user (simplified)
// @access  Public
router.post("/register", async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      error: "Registration not implemented in demo version",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   POST /api/auth/create-user
// @desc    Create new user (Admin only)
// @access  Private (Admin)
router.post("/create-user", authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin privileges required.",
      });
    }

    const { username, password, name, phone, role, assignedClassId } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        error: "Username, password, and name are required",
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Username already exists",
      });
    }

    // Find assigned class if provided
    let assignedClass = null;
    if (assignedClassId) {
      const Class = require("../models/Class");
      assignedClass = await Class.findById(assignedClassId);
      if (!assignedClass) {
        return res.status(404).json({
          success: false,
          error: "Assigned class not found",
        });
      }
    }

    // Create new user
    const newUser = new User({
      username,
      password, // Will be hashed by the model's pre-save middleware
      name,
      phone: phone || "",
      role: role || "servant",
      assignedClass: assignedClass ? assignedClass._id : null,
    });

    await newUser.save();

    // Populate assignedClass for response
    await newUser.populate("assignedClass");

    // Remove password from response
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      username: newUser.username,
      role: newUser.role,
      assignedClass: newUser.assignedClass,
      phone: newUser.phone,
    };

    res.status(201).json({
      success: true,
      data: userResponse,
      message: "User created successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authMiddleware, async (req, res) => {
  try {
    // Get user from middleware (req.user is set by authMiddleware)
    const user = await User.findById(req.user.userId).populate("assignedClass");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userResponse = {
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      assignedClass: user.assignedClass,
      phone: user.phone,
    };

    res.json({
      success: true,
      data: {
        user: userResponse
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;
