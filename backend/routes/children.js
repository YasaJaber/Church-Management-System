const express = require("express");
const Child = require("../models/Child");
const Class = require("../models/Class");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/children
// @desc    Get all children (role-based filtering)
// @access  Protected
router.get("/", authMiddleware, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(50));
    console.log("🔍 GET /children API CALLED");
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("🏫 Assigned Class:", req.user?.assignedClass || "NONE");
    console.log("=".repeat(50));

    let childrenQuery = {};

    // Role-based access control
    if (req.user.role === "admin") {
      // Admin sees all children
      childrenQuery = {};
      console.log("👑 Admin access - showing all children");
    } else if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      // Servant or Class Teacher sees only their class children
      childrenQuery = { class: req.user.assignedClass._id };
      console.log("👤 Servant/ClassTeacher access - filtering by class:", req.user.assignedClass._id);
    } else {
      console.log("❌ Access denied - role:", req.user.role, "assignedClass:", req.user.assignedClass);
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    const children = await Child.find({ ...childrenQuery, isActive: true })
      .populate("class")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: children,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/children/class/:classId
// @desc    Get children by class (with permission check)
// @access  Protected
router.get("/class/:classId", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;

    // Check if user has permission to view this class
    if (req.user.role !== "admin") {
      if (
        !req.user.assignedClass ||
        req.user.assignedClass._id.toString() !== classId
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Access denied. You can only view children in your assigned class.",
        });
      }
    }

    const classChildren = await Child.find({ class: classId, isActive: true })
      .populate("class")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: classChildren,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/children/:id
// @desc    Get single child details (with permission check)
// @access  Protected
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const child = await Child.findById(req.params.id).populate("class");

    if (!child) {
      return res.status(404).json({
        success: false,
        error: "Child not found",
      });
    }

    // Check if user has permission to view this child
    if (req.user.role !== "admin") {
      if (
        !req.user.assignedClass ||
        child.class._id.toString() !== req.user.assignedClass._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Access denied. You can only view children in your assigned class.",
        });
      }
    }

    res.json({
      success: true,
      data: child,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   POST /api/children
// @desc    Add new child (with permission check)
// @access  Protected
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, age, phone, parentName, classId, notes } = req.body;

    // فقط الاسم مطلوب
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "اسم الطفل مطلوب",
      });
    }

    // تحديد الفصل تلقائياً حسب المستخدم
    let targetClassId = classId;
    if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      // الخادم أو المدرس يضيف في فصله فقط
      targetClassId = req.user.assignedClass._id;
    } else if (!targetClassId) {
      // إذا لم يحدد فصل، استخدم أول فصل متاح (للأدمن)
      const firstClass = await Class.findOne({ isActive: true }).sort({
        order: 1,
      });
      if (firstClass) {
        targetClassId = firstClass._id;
      } else {
        return res.status(400).json({
          success: false,
          error: "لا يوجد فصول متاحة",
        });
      }
    }

    // Find the class
    const childClass = await Class.findById(targetClassId);
    if (!childClass) {
      return res.status(404).json({
        success: false,
        error: "الفصل غير موجود",
      });
    }

    // Check if user has permission to add children to this class
    if (req.user.role !== "admin") {
      if (
        !req.user.assignedClass ||
        req.user.assignedClass._id.toString() !== targetClassId.toString()
      ) {
        return res.status(403).json({
          success: false,
          error: "يمكنك فقط إضافة أطفال لفصلك المخصص",
        });
      }
    }

    // Create new child with default values
    const newChild = new Child({
      name: name.trim(),
      age: age ? parseInt(age) : 8, // عمر افتراضي 8 سنوات
      phone: phone ? phone.trim() : "",
      parentName: parentName ? parentName.trim() : name.trim(), // اسم الطفل كولي أمر افتراضي
      class: targetClassId,
      notes: notes ? notes.trim() : "",
    });

    // Save to database
    const savedChild = await newChild.save();
    await savedChild.populate("class");

    res.status(201).json({
      success: true,
      data: savedChild,
      message: "تم إضافة الطفل بنجاح",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   PUT /api/children/:id
// @desc    Update child information (with permission check)
// @access  Protected
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const child = await Child.findById(req.params.id).populate("class");

    if (!child) {
      return res.status(404).json({
        success: false,
        error: "Child not found",
      });
    }

    // Check if user has permission to edit this child
    if (req.user.role !== "admin") {
      if (
        !req.user.assignedClass ||
        child.class._id.toString() !== req.user.assignedClass._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Access denied. You can only edit children in your assigned class.",
        });
      }
    }

    const { name, age, phone, parentName, classId, notes } = req.body;

    // Find the class if classId is provided
    if (classId) {
      const newClass = await Class.findById(classId);
      if (!newClass) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      // Check if user has permission to move child to this class
      if (req.user.role !== "admin") {
        if (
          !req.user.assignedClass ||
          req.user.assignedClass._id.toString() !== classId
        ) {
          return res.status(403).json({
            success: false,
            error:
              "Access denied. You can only move children to your assigned class.",
          });
        }
      }
    }

    // Update child fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = parseInt(age);
    if (phone !== undefined) updateData.phone = phone;
    if (parentName !== undefined) updateData.parentName = parentName;
    if (classId !== undefined) updateData.class = classId;
    if (notes !== undefined) updateData.notes = notes;

    const updatedChild = await Child.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("class");

    res.json({
      success: true,
      data: updatedChild,
      message: "Child updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   DELETE /api/children/:id
// @desc    Delete child (with permission check)
// @access  Protected
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const child = await Child.findById(req.params.id).populate("class");

    if (!child) {
      return res.status(404).json({
        success: false,
        error: "Child not found",
      });
    }

    // Check if user has permission to delete this child
    if (req.user.role !== "admin") {
      if (
        !req.user.assignedClass ||
        child.class._id.toString() !== req.user.assignedClass._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Access denied. You can only delete children in your assigned class.",
        });
      }
    }

    await Child.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Child deleted successfully",
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
