const express = require("express");
const Child = require("../models/Child");
const Class = require("../models/Class");

const router = express.Router();

// @route   GET /api/test/fourth-grade-count
// @desc    Get current count of fourth grade children
// @access  Public (for testing)
router.get("/fourth-grade-count", async (req, res) => {
  try {
    // البحث عن فصل الرابع الابتدائي
    const fourthGradeClass = await Class.findOne({ 
      name: "رابعة ابتدائي",
      stage: "Primary" 
    });
    
    if (!fourthGradeClass) {
      return res.status(404).json({
        success: false,
        error: "Fourth grade class not found"
      });
    }

    // عد الأطفال
    const childrenCount = await Child.countDocuments({ 
      class: fourthGradeClass._id,
      isActive: true 
    });

    // الحصول على الأسماء
    const children = await Child.find({ 
      class: fourthGradeClass._id,
      isActive: true 
    }).select('name').sort({ name: 1 });

    res.json({
      success: true,
      data: {
        className: fourthGradeClass.name,
        count: childrenCount,
        children: children.map(child => child.name),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error fetching fourth grade count:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

module.exports = router;
