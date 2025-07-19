const express = require("express");
const Class = require("../models/Class");

const router = express.Router();

// @route   GET /api/classes
// @desc    Get all classes
// @access  Public
router.get("/", async (req, res) => {
  try {
    const classes = await Class.find().sort({ order: 1 });

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
