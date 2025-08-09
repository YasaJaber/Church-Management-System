const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Child = require("../models/Child");
const Class = require("../models/Class");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

// @route   GET /api/statistics/church
// @desc    Get church-wide statistics for dashboard
// @access  Protected
router.get("/church", authMiddleware, async (req, res) => {
  try {
    console.log("🏛️ Fetching church statistics for dashboard");
    console.log("👤 User role:", req.user.role);
    console.log("🏫 User assigned class:", req.user.assignedClass);

    // Get today's date as string (YYYY-MM-DD format)
    const today = new Date().toISOString().split("T")[0];
    console.log("📅 Today's date:", today);

    let totalChildren, totalClasses, totalServants, todaysAttendance;

    // Role-based statistics
    if (req.user.role === "admin" || req.user.role === "serviceLeader") {
      // Admin and Service Leader see all church statistics
      console.log("👑 Admin/ServiceLeader - showing all church statistics");

      totalChildren = await Child.countDocuments({ isActive: true });
      totalClasses = await Class.countDocuments();
      totalServants = await User.countDocuments({
        role: "servant",
      });

      // Get today's attendance records for all classes
      todaysAttendance = await Attendance.find({
        date: today,
        type: "child",
      });
    } else if (
      (req.user.role === "classTeacher" || req.user.role === "servant") &&
      req.user.assignedClass
    ) {
      // Class teachers and servants see only their class statistics
      console.log(
        "👤 ClassTeacher/Servant - showing class statistics for:",
        req.user.assignedClass
      );

      // Get children count for their assigned class only
      totalChildren = await Child.countDocuments({
        class: req.user.assignedClass._id,
        isActive: true,
      });

      // For class teachers, they see only 1 class (their own)
      totalClasses = 1;

      // Count servants in their class only
      totalServants = await User.countDocuments({
        role: "servant",
        assignedClass: req.user.assignedClass._id,
      });

      // Get today's attendance records for their class only
      todaysAttendance = await Attendance.find({
        date: today,
        type: "child",
        class: req.user.assignedClass._id,
      });
    } else {
      // No assigned class or invalid role
      console.log("❌ Invalid role or no assigned class");
      return res.status(403).json({
        success: false,
        error: "غير مسموح - لا توجد صلاحيات كافية",
      });
    }

    console.log("👶 Total children:", totalChildren);
    console.log("🏫 Total classes:", totalClasses);
    console.log("🙏 Total servants:", totalServants);
    console.log("📊 Today's attendance records:", todaysAttendance.length);

    // Calculate present and absent for today
    const presentToday = todaysAttendance.filter(
      (record) => record.status === "present"
    ).length;
    const absentToday = todaysAttendance.filter(
      (record) => record.status === "absent"
    ).length;
    const totalTodayRecords = presentToday + absentToday;

    console.log("✅ Present today:", presentToday);
    console.log("❌ Absent today:", absentToday);

    // Calculate attendance rate (for today or overall if no data today)
    let attendanceRate = 0;
    if (totalTodayRecords > 0) {
      attendanceRate = Math.round((presentToday / totalTodayRecords) * 100);
    } else {
      // If no attendance data for today, calculate overall attendance rate for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

      const recentAttendance = await Attendance.find({
        date: { $gte: thirtyDaysAgoStr, $lte: today },
        type: "child",
      });

      const recentPresent = recentAttendance.filter(
        (r) => r.status === "present"
      ).length;
      const recentTotal = recentAttendance.length;

      if (recentTotal > 0) {
        attendanceRate = Math.round((recentPresent / recentTotal) * 100);
      }
    }

    console.log("📈 Attendance rate:", attendanceRate + "%");

    const response = {
      success: true,
      data: {
        totalChildren,
        totalClasses,
        totalServants,
        presentToday,
        absentToday,
        attendanceRate,
        date: today,
      },
    };

    console.log("✅ Sending church statistics:", response.data);
    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching church statistics:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع إحصائيات الكنيسة",
    });
  }
});

// @route   GET /api/statistics/consecutive-attendance
// @desc    Get consecutive attendance statistics
// @access  Protected
router.get("/consecutive-attendance", authMiddleware, async (req, res) => {
  try {
    console.log("📊 Fetching consecutive attendance statistics");

    const { minDays = 3 } = req.query;

    // Get all children
    const children = await Child.find({}).populate("classId", "name category");

    const consecutiveData = [];

    for (const child of children) {
      // Get attendance records for this child, sorted by date desc
      const attendanceRecords = await Attendance.find({
        person: child._id,
        type: "child",
      }).sort({ date: -1 });

      // Calculate consecutive attendance
      let consecutiveCount = 0;
      for (const record of attendanceRecords) {
        if (record.status === "present") {
          consecutiveCount++;
        } else {
          break;
        }
      }

      // Only include children with consecutive attendance >= minDays
      if (consecutiveCount >= minDays) {
        consecutiveData.push({
          childId: child._id,
          name: child.name,
          className: child.classId?.name || "غير محدد",
          category: child.classId?.category || "غير محدد",
          consecutiveDays: consecutiveCount,
          lastAttendance:
            attendanceRecords.length > 0 ? attendanceRecords[0].date : null,
        });
      }
    }

    // Sort by consecutive days desc
    consecutiveData.sort((a, b) => b.consecutiveDays - a.consecutiveDays);

    console.log(
      `✅ Found ${consecutiveData.length} children with consecutive attendance >= ${minDays} days`
    );

    res.json({
      success: true,
      data: consecutiveData,
      summary: {
        totalChildren: consecutiveData.length,
        minDays: parseInt(minDays),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching consecutive attendance:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع إحصائيات الحضور المتتالي",
    });
  }
});

// @route   GET /api/statistics/consecutive-attendance-by-classes
// @desc    Get consecutive attendance statistics grouped by classes
// @access  Protected
router.get("/consecutive-attendance-by-classes", authMiddleware, async (req, res) => {
  try {
    console.log("📊 Fetching consecutive attendance statistics by classes");

    const { classId, minDays = 3 } = req.query;

    // Get all classes or specific class
    let classes;
    if (classId) {
      classes = await Class.find({ _id: classId });
    } else {
      classes = await Class.find({});
    }

    const classesData = [];

    for (const classObj of classes) {
      // Get children in this class
      const children = await Child.find({ 
        classId: classObj._id,
        isActive: true 
      });

      const consecutiveChildren = [];

      for (const child of children) {
        // Get attendance records for this child, sorted by date desc
        const attendanceRecords = await Attendance.find({
          person: child._id,
          type: "child",
        }).sort({ date: -1 });

        // Calculate consecutive attendance (convert days to weeks)
        let consecutiveCount = 0;
        for (const record of attendanceRecords) {
          if (record.status === "present") {
            consecutiveCount++;
          } else {
            break;
          }
        }

        // Convert days to weeks and only include children with consecutive attendance >= minDays
        const consecutiveWeeks = Math.floor(consecutiveCount / 1); // Each day counts as attendance
        if (consecutiveCount >= minDays) {
          consecutiveChildren.push({
            childId: child._id,
            name: child.name,
            consecutiveWeeks: consecutiveWeeks, // Frontend expects this field name
          });
        }
      }

      // Sort children by consecutive weeks desc
      consecutiveChildren.sort((a, b) => b.consecutiveWeeks - a.consecutiveWeeks);

      // Only include classes that have consecutive children
      if (consecutiveChildren.length > 0) {
        classesData.push({
          classId: classObj._id,
          className: classObj.name,
          children: consecutiveChildren, // Frontend expects this structure
        });
      }
    }

    // Sort classes by number of consecutive children desc
    classesData.sort((a, b) => b.children.length - a.children.length);

    console.log(
      `✅ Found ${classesData.length} classes with consecutive attendance data`
    );

    res.json({
      success: true,
      data: classesData,
      summary: {
        totalClasses: classesData.length,
        minDays: parseInt(minDays),
        totalConsecutiveChildren: classesData.reduce((sum, cls) => sum + cls.children.length, 0)
      },
    });
  } catch (error) {
    console.error("❌ Error fetching consecutive attendance by classes:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع إحصائيات الحضور المتتالي بالفصول",
    });
  }
});

module.exports = router;
