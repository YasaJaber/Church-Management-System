const express = require("express");
const Class = require("../models/Class");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/classes
// @desc    Get all classes (role-based access)
// @access  Protected
router.get("/", authMiddleware, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(50));
    console.log("🔍 GET /classes API CALLED");
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("🏫 Assigned Class:", req.user?.assignedClass || "NONE");
    console.log("=".repeat(50));

    let classes;

    // Role-based access control
    if (req.user.role === "admin" || req.user.role === "serviceLeader") {
      // Admin and Service Leader see all classes
      classes = await Class.find().sort({ order: 1 });
      console.log(
        `👑 ${req.user.role} access - showing all`,
        classes.length,
        "classes"
      );
    } else if (
      (req.user.role === "servant" || req.user.role === "classTeacher") &&
      req.user.assignedClass
    ) {
      // Servant or Class Teacher sees only their assigned class
      classes = [req.user.assignedClass];
      console.log(
        "👤 Servant/ClassTeacher access - showing assigned class:",
        req.user.assignedClass.name
      );
    } else {
      console.log(
        "❌ Access denied - role:",
        req.user.role,
        "assignedClass:",
        req.user.assignedClass
      );
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    res.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/classes/:id
// @desc    Get single class details
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: "Class not found",
      });
    }

    res.json({
      success: true,
      data: classData,
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
