const express = require("express");
const Child = require("../models/Child");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const FollowUpIgnore = require("../models/FollowUpIgnore");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/attendance/children
// @desc    Get children attendance by date and class (role-based access)
// @access  Protected
router.get("/children", authMiddleware, async (req, res) => {
  try {
    const { date, classId } = req.query;

    // Build query
    let query = { type: "child" };
    if (date) query.date = new Date(date);

    // Apply role-based filtering
    let targetClassId = classId;
    if (req.user.role === "servant" && req.user.assignedClass) {
      // Servants can only see their assigned class
      targetClassId = req.user.assignedClass._id.toString();
    } else if (req.user.role !== "admin" && !req.user.assignedClass) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    if (targetClassId) {
      // Need to get children in that class first
      const childrenInClass = await Child.find({ class: targetClassId });
      const childIds = childrenInClass.map((child) => child._id);
      query.person = { $in: childIds };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate({
        path: "person",
        populate: { path: "class" },
      })
      .sort({ date: -1 });

    // Transform data to match frontend expectations
    const transformedData = attendanceRecords.map((record) => ({
      _id: record._id,
      child: record.person,
      date: record.date.toISOString().split("T")[0],
      status: record.status,
      notes: record.notes,
    }));

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

    if (!childId || !date || !status) {
      return res.status(400).json({
        success: false,
        error: "Child ID, date, and status are required",
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

    // Check if attendance already exists
    const existingRecord = await Attendance.findOne({
      person: childId,
      date: attendanceDate,
      type: "child",
    });

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

    // Populate the response
    await attendanceRecord.populate({
      path: "person",
      populate: { path: "class" },
    });

    // Transform to match frontend expectations
    const responseData = {
      _id: attendanceRecord._id,
      child: attendanceRecord.person,
      date: attendanceRecord.date.toISOString().split("T")[0],
      status: attendanceRecord.status,
      notes: attendanceRecord.notes,
    };

    // Log attendance for debugging
    console.log(`📝 Attendance recorded:`);
    console.log(`   Child: ${attendanceRecord.person.name}`);
    console.log(`   Status: ${attendanceRecord.status}`);
    console.log(
      `   Date: ${attendanceRecord.date.toISOString().split("T")[0]}`
    );
    console.log(`   Recorded by: ${req.user.name} (${req.user._id})`);
    console.log(
      `   Class: ${attendanceRecord.person.class?.name || "Unknown"}`
    );

    res.json({
      success: true,
      data: responseData,
      message: "Attendance marked successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
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

    // Parse date to match stored format (midnight UTC)
    const attendanceDate = new Date(date + "T00:00:00.000Z"); // Midnight UTC to match stored data

    // Find and delete the attendance record
    const deletedRecord = await Attendance.findOneAndDelete({
      person: childId,
      date: attendanceDate,
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

// @route   GET /api/attendance/follow-up
// @desc    Get children who have been absent for consecutive weeks (افتقاد)
// @access  Protected
router.get("/follow-up", authMiddleware, async (req, res) => {
  try {
    console.log("🔍 Follow-up API called by:", req.user.name, req.user.role);

    // Get the last 12 Friday dates
    const getFridayDatesBack = (weeksBack) => {
      const fridays = [];
      const today = new Date();

      for (let i = 0; i < weeksBack; i++) {
        const friday = new Date();
        const dayOfWeek = today.getDay();
        let daysToSubtract;

        if (dayOfWeek === 5) {
          daysToSubtract = i * 7;
        } else if (dayOfWeek > 5) {
          daysToSubtract = dayOfWeek - 5 + i * 7;
        } else {
          daysToSubtract = dayOfWeek + 2 + i * 7;
        }

        friday.setDate(today.getDate() - daysToSubtract);
        fridays.push(friday.toISOString().split("T")[0]);
      }

      return fridays;
    };

    const fridayDates = getFridayDatesBack(12);
    // Sort dates from newest to oldest (most recent Friday first)
    fridayDates.sort((a, b) => new Date(b) - new Date(a));

    console.log("📅 Friday dates (newest first):", fridayDates);

    // Build children query based on user role
    let childrenQuery = { isActive: true };
    if (req.user.role === "servant" && req.user.assignedClass) {
      childrenQuery.class = req.user.assignedClass._id;
    }

    // Get all children
    // Get a list of children to ignore
    const ignoredChildren = await FollowUpIgnore.find({}).select("child -_id");
    const ignoredChildIds = ignoredChildren.map((item) => item.child);

    // Exclude ignored children from the main query
    childrenQuery._id = { $nin: ignoredChildIds };

    // Get all children that are not ignored
    const children = await Child.find(childrenQuery).populate("class");

    const followUpResults = {};

    // Check each child's consecutive absence
    for (const child of children) {
      // Get attendance records for this child (sorted by date descending - newest first)
      const attendanceRecords = await Attendance.find({
        person: child._id,
        type: "child",
        date: { $in: fridayDates },
      }).sort({ date: -1 });

      // Create a map of dates to status
      const attendanceMap = {};
      attendanceRecords.forEach((record) => {
        const dateStr = record.date.toISOString().split("T")[0];
        attendanceMap[dateStr] = record.status;
      });

      // console.log(`👶 Checking child: ${child.name}`);
      // console.log(`📊 Attendance map:`, attendanceMap);

      // Count consecutive absences from the most recent Friday
      // This counts CURRENT consecutive absences only - any attendance breaks the streak
      let consecutiveAbsences = 0;
      for (const date of fridayDates) {
        const status = attendanceMap[date];
        if (status === "absent" || !status) {
          // Count as absent if marked absent OR if no record exists
          consecutiveAbsences++;
          console.log(
            `   ❌ ${date}: ${
              status || "no record"
            } (consecutive: ${consecutiveAbsences})`
          );
        } else if (status === "present") {
          // ANY attendance breaks the consecutive absence streak
          // This child attended recently, so they don't need follow-up
          console.log(
            `   ✅ ${date}: present - child attended recently, no follow-up needed`
          );
          consecutiveAbsences = 0; // Reset to 0 since they attended
          break; // Stop counting - child is not in follow-up list
        }
      }

      console.log(
        `🔢 ${child.name}: ${consecutiveAbsences} consecutive absences (current streak)`
      );

      // Only include children with 2+ consecutive absences
      if (consecutiveAbsences >= 2) {
        if (!followUpResults[consecutiveAbsences]) {
          followUpResults[consecutiveAbsences] = [];
        }

        // Get the last attendance date for this child
        const lastPresentRecord = attendanceRecords.find(
          (r) => r.status === "present"
        );

        followUpResults[consecutiveAbsences].push({
          _id: child._id,
          name: child.name,
          age: child.age,
          phone: child.phone,
          parentName: child.parentName,
          class: child.class,
          consecutiveAbsences,
          lastAttendance: lastPresentRecord ? lastPresentRecord.date : null,
          notes: child.notes || "",
        });
      }
    }

    // Sort each group by name
    Object.keys(followUpResults).forEach((key) => {
      followUpResults[key].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    });

    // Calculate summary statistics
    const totalFollowUpChildren = Object.values(followUpResults).reduce(
      (sum, group) => sum + group.length,
      0
    );

    const groupSummary = Object.keys(followUpResults)
      .map((weeks) => ({
        consecutiveWeeks: parseInt(weeks),
        count: followUpResults[weeks].length,
        children: followUpResults[weeks],
      }))
      .sort((a, b) => a.consecutiveWeeks - b.consecutiveWeeks);

    console.log(`📊 Found ${totalFollowUpChildren} children needing follow-up`);

    res.json({
      success: true,
      data: {
        summary: {
          totalFollowUpChildren,
          groupsCount: Object.keys(followUpResults).length,
          userRole: req.user.role,
          className: req.user.assignedClass?.name || "جميع الفصول",
        },
        groups: groupSummary,
        lastUpdated: new Date(),
        note: "الأطفال الذين غابوا جمعتين متتاليتين أو أكثر",
      },
    });
  } catch (error) {
    console.error("❌ Error in follow-up route:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم",
    });
  }
});

// @route   POST /api/attendance/ignore-follow-up
// @desc    Add a child to the follow-up ignore list for the session
// @access  Protected
router.post("/ignore-follow-up", authMiddleware, async (req, res) => {
  try {
    const { childId } = req.body;

    if (!childId) {
      return res.status(400).json({
        success: false,
        error: "Child ID is required",
      });
    }

    // Use updateOne with upsert to avoid duplicates and keep it clean
    await FollowUpIgnore.updateOne(
      { child: childId },
      { $set: { ignoredBy: req.user._id } },
      { upsert: true } // Creates the document if it doesn't exist
    );

    res.json({
      success: true,
      message: "Child will be ignored in the follow-up list.",
    });
  } catch (error) {
    console.error("Error ignoring follow-up child:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;

