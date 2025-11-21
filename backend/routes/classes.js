const express = require("express");
const Class = require("../models/Class");
const { authMiddleware } = require("../middleware/auth");
const { asyncHandler } = require('../middleware/errorHandler');
const { AuthorizationError, NotFoundError } = require('../utils/errors');

const router = express.Router();

// @route   GET /api/classes
// @desc    Get all classes (role-based access)
// @access  Protected
router.get("/", authMiddleware, asyncHandler(async (req, res) => {
  let classes;

  // Role-based access control
  if (req.user.role === "admin" || req.user.role === "serviceLeader") {
    // Admin and Service Leader see all classes
    classes = await Class.find().sort({ order: 1 });
  } else if (
    (req.user.role === "servant" || req.user.role === "classTeacher") &&
    req.user.assignedClass
  ) {
    // Servant or Class Teacher sees only their assigned class
    classes = [req.user.assignedClass];
  } else {
    throw new AuthorizationError("ليس لديك صلاحية للوصول إلى الفصول");
  }

  res.json({
    success: true,
    data: classes,
  });
}));

// @route   GET /api/classes/:id
// @desc    Get single class details
// @access  Public
router.get("/:id", asyncHandler(async (req, res) => {
  const classData = await Class.findById(req.params.id);

  if (!classData) {
    throw new NotFoundError("الفصل غير موجود");
  }

  res.json({
    success: true,
    data: classData,
  });
}));

module.exports = router;
