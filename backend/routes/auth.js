const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const { userValidation } = require("../middleware/validator");
const {
  ValidationError,
  AuthenticationError,
  InternalServerError,
} = require("../utils/errors");

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", userValidation.login, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Find user by username and populate assigned class
  const user = await User.findOne({ username }).populate("assignedClass");

  if (!user) {
    throw new AuthenticationError("اسم المستخدم أو كلمة المرور غير صحيحة");
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AuthenticationError("اسم المستخدم أو كلمة المرور غير صحيحة");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AuthenticationError("الحساب غير مفعل. يرجى التواصل مع المسؤول");
  }

  // Verify JWT_SECRET exists
  if (!process.env.JWT_SECRET) {
    throw new InternalServerError("خطأ في إعدادات الخادم");
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
    message: "تم تسجيل الدخول بنجاح",
  });
}));

// @route   GET /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.get("/verify", authMiddleware, asyncHandler(async (req, res) => {
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
    message: "الرمز صالح",
  });
}));

// @route   POST /api/auth/register
// @desc    Register new user (simplified)
// @access  Public
router.post("/register", asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    error: "التسجيل غير متاح في النسخة التجريبية",
  });
}));

// @route   POST /api/auth/create-user
// @desc    Create new user (Admin only)
// @access  Private (Admin)
router.post("/create-user", authMiddleware, asyncHandler(async (req, res) => {
  const { AuthorizationError, NotFoundError, ConflictError } = require("../utils/errors");
  
  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new AuthorizationError("ليس لديك صلاحية. يجب أن تكون مسؤولاً");
  }

  const { username, password, name, phone, role, assignedClassId } = req.body;

  if (!username || !password || !name) {
    throw new ValidationError("اسم المستخدم وكلمة المرور والاسم مطلوبان");
  }

  // Check if username already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new ConflictError("اسم المستخدم موجود بالفعل");
  }

  // Find assigned class if provided
  let assignedClass = null;
  if (assignedClassId) {
    const Class = require("../models/Class");
    assignedClass = await Class.findById(assignedClassId);
    if (!assignedClass) {
      throw new NotFoundError("الفصل المحدد غير موجود");
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
    message: "تم إنشاء المستخدم بنجاح",
  });
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authMiddleware, asyncHandler(async (req, res) => {
  const { NotFoundError } = require("../utils/errors");
  
  // Get user from middleware (req.user is set by authMiddleware)
  const user = await User.findById(req.user.userId).populate("assignedClass");

  if (!user) {
    throw new NotFoundError("المستخدم غير موجود");
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
}));

module.exports = router;
