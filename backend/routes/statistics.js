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

    // Get today's date as string (YYYY-MM-DD format)
    const today = new Date().toISOString().split("T")[0];
    console.log("📅 Today's date:", today);

    // Get total children count
    const totalChildren = await Child.countDocuments();
    console.log("👶 Total children:", totalChildren);

    // Get total classes count
    const totalClasses = await Class.countDocuments();
    console.log("🏫 Total classes:", totalClasses);

    // Get total servants count
    const totalServants = await User.countDocuments({
      role: { $in: ["servant", "classTeacher"] },
    });
    console.log("🙏 Total servants:", totalServants);

    // Get today's attendance records
    const todaysAttendance = await Attendance.find({
      date: today,
      type: "child",
    });
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

module.exports = router;
