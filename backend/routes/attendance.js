const express = require("express");
const Child = require("../models/Child");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const PastoralCare = require("../models/PastoralCare");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/attendance/children
// @desc    Get children attendance by date and class (role-based access)
// @access  Protected
router.get("/children", authMiddleware, async (req, res) => {
  try {
    const { date, classId } = req.query;

    console.log("\n" + "=".repeat(50));
    console.log("🔍 GET /children API CALLED");
    console.log("📅 Date:", date);
    console.log("🏫 ClassId:", classId);
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("=".repeat(50));

    // Build query - handle date range for both Date objects and strings
    let query = { type: "child" };
    if (date) {
      // نبدأ من 00:00:00 للتاريخ
      const dayStart = new Date(date + "T00:00:00.000Z");
      // ننهي عند بداية اليوم التالي
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      query.date = { $gte: dayStart, $lt: dayEnd };
      console.log("📅 Date range query:");
      console.log("   Start:", dayStart.toISOString());
      console.log("   End:", dayEnd.toISOString());
    }

    // Apply role-based filtering
    let targetClassId = classId;
    if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      // Servants and classTeachers can only see their assigned class
      targetClassId = req.user.assignedClass._id.toString();
      console.log("👤 Servant/ClassTeacher access - forced classId:", targetClassId);
    } else if (req.user.role !== "admin" && !req.user.assignedClass) {
      console.log("❌ Access denied for non-admin without class");
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (targetClassId) {
      // Need to get children in that class first
      console.log("🔍 Filtering by class:", targetClassId);
      const childrenInClass = await Child.find({ class: targetClassId });
      const childIds = childrenInClass.map((child) => child._id);
      console.log("👥 Found", childrenInClass.length, "children in class");
      console.log(
        "👥 Child IDs:",
        childIds.map((id) => id.toString())
      );
      query.person = { $in: childIds };
    }

    console.log("🔍 Final query:", JSON.stringify(query));
    const attendanceRecords = await Attendance.find(query)
      .populate({
        path: "person",
        populate: { path: "class" },
      })
      .sort({ date: -1 });

    console.log("📊 Found", attendanceRecords.length, "attendance records");
    console.log(
      "📊 Records:",
      attendanceRecords.map((r) => ({
        child: r.person?.name,
        status: r.status,
        date: r.date,
      }))
    );

    // Transform data to match frontend expectations
    const transformedData = attendanceRecords.map((record) => ({
      _id: record._id,
      child: record.person,
      date:
        typeof record.date === "string"
          ? record.date
          : record.date.toISOString().split("T")[0],
      status: record.status,
      notes: record.notes,
    }));

    console.log("✅ Returning", transformedData.length, "records to frontend");
    console.log("✅ Sample data:", transformedData.slice(0, 2));

    res.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   POST /api/attendance
// @desc    Mark attendance for a child
// @access  Protected
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { childId, date, status, notes } = req.body;

    console.log("📨 POST /attendance called");
    console.log("📄 Request body:", req.body);
    console.log("🔍 Extracted values:");
    console.log("   childId:", childId);
    console.log("   date:", date);
    console.log("   status:", status);
    console.log("   notes:", notes);

    if (!childId || !date || !status) {
      console.log("❌ Missing required fields:");
      console.log("   childId missing:", !childId);
      console.log("   date missing:", !date);
      console.log("   status missing:", !status);

      return res.status(400).json({
        success: false,
        error: "Child ID, date, and status are required",
        received: { childId: !!childId, date: !!date, status: !!status },
      });
    }

    // Find the child
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({
        success: false,
        error: "Child not found",
      });
    }

    // Parse date to midnight UTC for consistency with stored data
    const attendanceDate = new Date(date + "T00:00:00.000Z"); // Midnight UTC

    // Check if attendance already exists using date range
    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const existingRecord = await Attendance.findOne({
      person: childId,
      date: { $gte: dayStart, $lt: dayEnd },
      type: "child",
    });

    console.log("🔍 Checking for existing attendance record:");
    console.log("   Child ID:", childId);
    console.log(
      "   Date range:",
      dayStart.toISOString(),
      "to",
      dayEnd.toISOString()
    );
    console.log("   Found existing:", existingRecord ? "YES" : "NO");

    let attendanceRecord;

    if (existingRecord) {
      // Update existing record
      existingRecord.status = status;
      existingRecord.notes = notes || "";
      existingRecord.recordedBy = req.user._id; // Update who modified it
      attendanceRecord = await existingRecord.save();
    } else {
      // Create new record
      attendanceRecord = new Attendance({
        type: "child",
        person: childId,
        personModel: "Child",
        date: attendanceDate,
        status: status,
        notes: notes || "",
        recordedBy: req.user._id, // The user who is recording attendance
        class: child.class, // Add class for better tracking
      });
      await attendanceRecord.save();
    }

    // Populate the response with all necessary details
    await attendanceRecord.populate([
      {
        path: "person",
        model: "Child",
        populate: {
          path: "class",
          model: "Class",
        },
      },
      {
        path: "recordedBy",
        model: "User",
        select: "name", // Select only the name of the user
      },
    ]);

    // Transform to match frontend expectations
    const responseData = {
      _id: attendanceRecord._id,
      child: attendanceRecord.person, // This is now populated with child and class details
      date:
        typeof attendanceRecord.date === "string"
          ? attendanceRecord.date
          : attendanceRecord.date.toISOString().split("T")[0],
      status: attendanceRecord.status,
      notes: attendanceRecord.notes,
      recordedBy: attendanceRecord.recordedBy, // Include who recorded it
    };

    // Log attendance for debugging
    console.log(`📝 Attendance recorded:`);
    console.log(`   Child: ${attendanceRecord.person.name}`);
    console.log(`   Status: ${attendanceRecord.status}`);
    console.log(
      `   Date: ${
        typeof attendanceRecord.date === "string"
          ? attendanceRecord.date
          : attendanceRecord.date.toISOString().split("T")[0]
      }`
    );
    console.log(`   Recorded by: ${req.user.name} (${req.user._id})`);
    console.log(
      `   Class: ${attendanceRecord.person.class?.name || "Unknown"}`
    );

    // ✨ PASTORAL CARE: Automatically remove child from pastoral care list if they attended
    if (status === "present" || status === "late") {
      try {
        console.log(`🤝 Checking if child ${attendanceRecord.person.name} needs to be removed from pastoral care...`);
        
        const activePastoralCareRecord = await PastoralCare.findOne({
          child: childId,
          isActive: true
        });

        if (activePastoralCareRecord) {
          activePastoralCareRecord.isActive = false;
          activePastoralCareRecord.removedBy = req.user._id;
          activePastoralCareRecord.removedDate = new Date();
          activePastoralCareRecord.removalReason = "attended";
          activePastoralCareRecord.notes += `\n\nتم حذفه تلقائياً من قائمة الافتقاد عند الحضور في ${date} بواسطة ${req.user.name}`;
          
          await activePastoralCareRecord.save();
          
          console.log(`✅ Child ${attendanceRecord.person.name} automatically removed from pastoral care (attended on ${date})`);
        } else {
          console.log(`ℹ️ Child ${attendanceRecord.person.name} was not in pastoral care list`);
        }
      } catch (pastoralCareError) {
        console.error("❌ Error updating pastoral care:", pastoralCareError);
        // Don't fail the attendance recording if pastoral care update fails
      }
    }

    res.json({
      success: true,
      data: responseData,
      message: "Attendance marked successfully",
    });
  } catch (error) {
    console.error("❌ Error in POST /attendance:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      childId: req.body?.childId,
      date: req.body?.date,
      status: req.body?.status,
    });
    res.status(500).json({
      success: false,
      error: "Server error: " + error.message,
    });
  }
});

// @route   DELETE /api/attendance/:childId/:date
// @desc    Delete attendance record for a child on a specific date
// @access  Protected
router.delete("/:childId/:date", authMiddleware, async (req, res) => {
  try {
    const { childId, date } = req.params;

    if (!childId || !date) {
      return res.status(400).json({
        success: false,
        error: "Child ID and date are required",
      });
    }

    // Parse date to match stored format using date range
    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    // Find and delete the attendance record using date range
    const deletedRecord = await Attendance.findOneAndDelete({
      person: childId,
      date: { $gte: dayStart, $lt: dayEnd },
      type: "child",
    });

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        error: "لا يوجد تسجيل حضور لهذا الطفل في هذا التاريخ",
      });
    }

    // Log the deletion
    console.log(`🗑️ Attendance record deleted:`);
    console.log(`   Child ID: ${childId}`);
    console.log(`   Date: ${date}`);
    console.log(`   Previous Status: ${deletedRecord.status}`);
    console.log(`   Deleted by: ${req.user.name} (${req.user._id})`);

    res.json({
      success: true,
      message: "تم مسح تسجيل الحضور بنجاح",
      data: {
        deletedRecord: {
          childId: deletedRecord.person,
          date: date,
          previousStatus: deletedRecord.status,
        },
      },
    });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ في مسح تسجيل الحضور",
    });
  }
});

// @route   POST /api/attendance/mark-all-present
// @desc    Mark all children in a class as present for a date
// @access  Public
router.post("/mark-all-present", async (req, res) => {
  try {
    const { classId, date } = req.body;

    if (!classId || !date) {
      return res.status(400).json({
        success: false,
        error: "Class ID and date are required",
      });
    }

    // Get all children in the class
    const classChildren = children.filter(
      (child) => child.class && child.class._id === classId
    );

    if (classChildren.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No children found in this class",
      });
    }

    // Mark attendance for each child
    let updatedCount = 0;
    classChildren.forEach((child) => {
      const existingIndex = attendanceRecords.findIndex(
        (record) => record.child._id === child._id && record.date === date
      );

      const attendanceRecord = {
        _id:
          existingIndex >= 0
            ? attendanceRecords[existingIndex]._id
            : generateId(),
        child: child,
        date: date,
        status: "present",
        notes: "",
      };

      if (existingIndex >= 0) {
        attendanceRecords[existingIndex] = attendanceRecord;
      } else {
        attendanceRecords.push(attendanceRecord);
      }
      updatedCount++;
    });

    res.json({
      success: true,
      message: `Marked ${updatedCount} children as present`,
      count: updatedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/attendance/recent-activity
// @desc    Get recent attendance activity (last 10 records regardless of date)
// @access  Protected
router.get("/recent-activity", authMiddleware, async (req, res) => {
  try {
    const { classId, limit = 10 } = req.query;

    console.log("\n" + "=".repeat(50));
    console.log("🔍 GET /recent-activity API CALLED");
    console.log("🏫 ClassId:", classId);
    console.log("📊 Limit:", limit);
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("=".repeat(50));

    // Build query
    let query = { type: "child" };

    // Apply role-based filtering
    let targetClassId = classId;
    if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      // Servants and classTeachers can only see their assigned class
      targetClassId = req.user.assignedClass._id.toString();
      console.log("👤 Servant/ClassTeacher access - forced classId:", targetClassId);
    } else if (req.user.role !== "admin" && !req.user.assignedClass) {
      console.log("❌ Access denied for non-admin without class");
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (targetClassId) {
      // Need to get children in that class first
      console.log("🔍 Filtering by class:", targetClassId);
      const childrenInClass = await Child.find({ class: targetClassId });
      const childIds = childrenInClass.map(child => child._id);
      query.person = { $in: childIds };
      console.log("👶 Found children in class:", childIds.length);
    }

    console.log("🔍 Final query:", JSON.stringify(query));

    // Get recent attendance records, sorted by creation date (newest first)
    const attendanceRecords = await Attendance.find(query)
      .populate({
        path: "person",
        populate: {
          path: "class",
          select: "stage grade",
        },
      })
      .sort({ createdAt: -1 }) // Most recent first
      .limit(parseInt(limit));

    console.log("📊 Found attendance records:", attendanceRecords.length);

    res.json({
      success: true,
      data: attendanceRecords,
    });

  } catch (error) {
    console.error("❌ Error in recent-activity:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;
