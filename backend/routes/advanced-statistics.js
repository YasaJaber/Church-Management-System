const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Child = require("../models/Child");
const Class = require("../models/Class");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

// @route   GET /api/advanced-statistics/attendance-trends
// @desc    Get attendance trends and patterns for charts
// @access  Protected
router.get("/attendance-trends", authMiddleware, async (req, res) => {
  try {
    const { classId, period = "month", startDate, endDate } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let filter = { type: "child" }; // فقط حضور الأطفال
    let classFilter = {};

    // إذا كان المستخدم مدرس فصل أو خادم، يجب أن يرى فصله فقط
    if (
      (userRole === "classTeacher" || userRole === "servant") &&
      req.user.assignedClass
    ) {
      classFilter._id = req.user.assignedClass;
    } else if (classId) {
      classFilter._id = classId;
    }

    // تحديد الفترة الزمنية
    const endDateObj = endDate ? new Date(endDate) : new Date();
    let startDateObj;

    if (startDate) {
      startDateObj = new Date(startDate);
    } else {
      startDateObj = new Date(endDateObj);
      switch (period) {
        case "week":
          startDateObj.setDate(startDateObj.getDate() - 7);
          break;
        case "month":
          startDateObj.setMonth(startDateObj.getMonth() - 1);
          break;
        case "quarter":
          startDateObj.setMonth(startDateObj.getMonth() - 3);
          break;
        case "year":
          startDateObj.setFullYear(startDateObj.getFullYear() - 1);
          break;
        default:
          startDateObj.setMonth(startDateObj.getMonth() - 1);
      }
    }

    // تحويل التواريخ لنص (لأن date في schema هو string)
    const startDateStr = startDateObj.toISOString().split("T")[0];
    const endDateStr = endDateObj.toISOString().split("T")[0];

    filter.date = {
      $gte: startDateStr,
      $lte: endDateStr,
    };

    // الحصول على الفصول
    const classes = await Class.find(classFilter);
    const classIds = classes.map((c) => c._id);

    if (classIds.length > 0) {
      filter.class = { $in: classIds };
    }

    // الحصول على بيانات الحضور
    const attendanceRecords = await Attendance.find(filter)
      .populate("person", "name")
      .populate("class", "name category")
      .sort({ date: 1 });

    // تجميع البيانات حسب التاريخ
    const dateGroups = {};
    attendanceRecords.forEach((record) => {
      const dateKey = record.date;
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = {
          date: dateKey,
          present: 0,
          absent: 0,
          total: 0,
          classes: {},
        };
      }

      const classId = record.class._id.toString();
      if (!dateGroups[dateKey].classes[classId]) {
        dateGroups[dateKey].classes[classId] = {
          className: record.class.name,
          category: record.class.category,
          present: 0,
          absent: 0,
          total: 0,
        };
      }

      if (record.status === "present") {
        dateGroups[dateKey].present++;
        dateGroups[dateKey].classes[classId].present++;
      } else {
        dateGroups[dateKey].absent++;
        dateGroups[dateKey].classes[classId].absent++;
      }

      dateGroups[dateKey].total++;
      dateGroups[dateKey].classes[classId].total++;
    });

    // تحويل إلى مصفوفة وترتيب حسب التاريخ
    const trendsData = Object.values(dateGroups).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    res.json({
      success: true,
      data: {
        trends: trendsData,
        period: period,
        startDate: startDateStr,
        endDate: endDateStr,
        totalRecords: attendanceRecords.length,
      },
    });
  } catch (error) {
    console.error("Error fetching attendance trends:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع بيانات الاتجاهات",
    });
  }
});

// @route   GET /api/advanced-statistics/class-comparison
// @desc    Get comparative statistics between classes
// @access  Protected (Admin/Service Leader only)
router.get("/class-comparison", authMiddleware, async (req, res) => {
  try {
    console.log("🔍 Class-comparison API called");
    console.log("📊 Query params:", req.query);
    console.log("👤 User role:", req.user.role);

    const { period = "month", startDate, endDate } = req.query;
    const userRole = req.user.role;

    // التحقق من الصلاحيات
    if (userRole !== "admin" && userRole !== "serviceLeader") {
      console.log("❌ Access denied for role:", userRole);
      return res.status(403).json({
        success: false,
        error: "غير مسموح - أمين الخدمة أو الأدمن فقط",
      });
    }

    console.log("✅ Access granted for role:", userRole);

    // تحديد الفترة الزمنية
    const endDateObj = endDate ? new Date(endDate) : new Date();
    let startDateObj = startDate ? new Date(startDate) : new Date(endDateObj);

    if (!startDate) {
      switch (period) {
        case "week":
          startDateObj.setDate(startDateObj.getDate() - 7);
          break;
        case "month":
          startDateObj.setMonth(startDateObj.getMonth() - 1);
          break;
        case "quarter":
          startDateObj.setMonth(startDateObj.getMonth() - 3);
          break;
        default:
          startDateObj.setMonth(startDateObj.getMonth() - 1);
      }
    }

    const startDateStr = startDateObj.toISOString().split("T")[0];
    const endDateStr = endDateObj.toISOString().split("T")[0];

    console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

    // الحصول على جميع الفصول
    const classes = await Class.find({});
    console.log(`🏫 Found ${classes.length} classes`);

    const classComparisons = [];

    for (const classObj of classes) {
      // عدد الأطفال في الفصل
      const totalChildren = await Child.countDocuments({
        classId: classObj._id,
      });

      // سجلات الحضور للفصل في الفترة المحددة
      const attendanceRecords = await Attendance.find({
        class: classObj._id,
        type: "child",
        date: { $gte: startDateStr, $lte: endDateStr },
      });

      // حساب الإحصائيات
      const presentCount = attendanceRecords.filter(
        (r) => r.status === "present"
      ).length;
      const absentCount = attendanceRecords.filter(
        (r) => r.status === "absent"
      ).length;
      const totalRecords = presentCount + absentCount;
      const attendanceRate =
        totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

      // عدد الجلسات المختلفة
      const uniqueDates = [...new Set(attendanceRecords.map((r) => r.date))];
      const totalSessions = uniqueDates.length;
      const avgAttendancePerSession =
        totalSessions > 0
          ? Math.round((presentCount / totalSessions) * 100) / 100
          : 0;

      classComparisons.push({
        classId: classObj._id,
        className: classObj.name,
        category: classObj.category || "غير محدد",
        totalChildren,
        totalSessions,
        presentCount,
        absentCount,
        attendanceRate,
        avgAttendancePerSession,
      });
    }

    // ترتيب حسب معدل الحضور
    classComparisons.sort((a, b) => b.attendanceRate - a.attendanceRate);

    console.log(`📊 Generated ${classComparisons.length} class comparisons`);
    classComparisons.slice(0, 3).forEach((cls) => {
      console.log(
        `  - ${cls.className}: ${cls.attendanceRate}% (${cls.presentCount}/${
          cls.presentCount + cls.absentCount
        })`
      );
    });

    const response = {
      success: true,
      data: {
        classComparisons,
        period,
        startDate: startDateStr,
        endDate: endDateStr,
        totalClasses: classes.length,
      },
    };

    console.log(
      "✅ Sending response with",
      response.data.classComparisons.length,
      "comparisons"
    );
    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching class comparison:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع مقارنة الفصول",
    });
  }
});

// @route   GET /api/advanced-statistics/children-needing-followup
// @desc    Get children who need pastoral follow-up (consecutive absences)
// @access  Protected
router.get("/children-needing-followup", authMiddleware, async (req, res) => {
  try {
    console.log("🔄 Attendance frequency API called");
    console.log("📊 Query params:", req.query);
    console.log("👤 User role:", req.user.role);

    const { period = "month", startDate, endDate, classId } = req.query;
    const userRole = req.user.role;

    // تحديد الفترة الزمنية
    const endDateObj = endDate ? new Date(endDate) : new Date();
    let startDateObj = startDate ? new Date(startDate) : new Date(endDateObj);

    if (!startDate) {
      switch (period) {
        case "week":
          startDateObj.setDate(startDateObj.getDate() - 7);
          break;
        case "month":
          startDateObj.setMonth(startDateObj.getMonth() - 1);
          break;
        case "quarter":
          startDateObj.setMonth(startDateObj.getMonth() - 3);
          break;
        default:
          startDateObj.setMonth(startDateObj.getMonth() - 1);
      }
    }

    const startDateStr = startDateObj.toISOString().split("T")[0];
    const endDateStr = endDateObj.toISOString().split("T")[0];

    console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

    let filter = {
      type: "child",
      date: { $gte: startDateStr, $lte: endDateStr },
    };

    // إذا كان المستخدم مدرس فصل أو خادم، فقط فصله
    if (
      (userRole === "classTeacher" || userRole === "servant") &&
      req.user.assignedClass
    ) {
      filter.class = req.user.assignedClass;
      console.log(
        `🔒 Teacher/Servant filter - class: ${req.user.assignedClass}`
      );
    } else if (classId) {
      filter.class = classId;
      console.log(`🔍 Filter by class: ${classId}`);
    } else {
      console.log(`📊 Filter all classes`);
    }

    console.log(`🔍 Final filter:`, filter);

    // تجميع البيانات حسب التاريخ والفصل
    const frequencyData = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            date: "$date",
            classId: "$class",
          },
          attendanceCount: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "classes",
          localField: "_id.classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    // تحليل تكرار أخذ الحضور
    const dateFrequency = {};
    frequencyData.forEach((record) => {
      const date = record._id.date;
      if (!dateFrequency[date]) {
        dateFrequency[date] = {
          date,
          classesWithAttendance: 0,
          totalAttendanceRecords: 0,
          classes: [],
        };
      }

      dateFrequency[date].classesWithAttendance++;
      dateFrequency[date].totalAttendanceRecords += record.attendanceCount;
      dateFrequency[date].classes.push({
        classId: record._id.classId,
        className: record.classInfo[0]?.name || "Unknown",
        category: record.classInfo[0]?.category || "غير محدد",
        attendanceCount: record.attendanceCount,
        presentCount: record.presentCount,
        absentCount: record.absentCount,
      });
    });

    // إحصائيات عامة
    const totalDays = Object.keys(dateFrequency).length;
    const avgClassesPerDay =
      totalDays > 0
        ? Object.values(dateFrequency).reduce(
            (sum, day) => sum + day.classesWithAttendance,
            0
          ) / totalDays
        : 0;

    console.log(`📊 Frequency data generated: ${totalDays} days`);
    console.log(`📊 Total frequency records: ${frequencyData.length}`);

    const response = {
      success: true,
      data: {
        frequencyByDate: Object.values(dateFrequency),
        summary: {
          totalDays,
          avgClassesPerDay: Math.round(avgClassesPerDay * 100) / 100,
          period,
        },
      },
    };

    console.log(
      "✅ Sending frequency response with",
      response.data.frequencyByDate.length,
      "records"
    );
    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching attendance frequency:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع تكرار الحضور",
    });
  }
});

// @route   GET /api/advanced-statistics/individual-class/:classId
// @desc    Get detailed statistics for individual class
// @access  Protected
router.get("/individual-class/:classId", authMiddleware, async (req, res) => {
  try {
    console.log("🎯 Individual class API called");
    console.log("🎯 Class ID:", req.params.classId);
    console.log("📊 Query params:", req.query);
    console.log("👤 User role:", req.user.role);
    console.log("👤 User assigned class:", req.user.assignedClass);

    const { classId } = req.params;
    const { period = "month", startDate, endDate } = req.query;
    const userRole = req.user.role;

    // التحقق من الصلاحيات
    if (userRole === "classTeacher" || userRole === "servant") {
      const assignedClassId = req.user.assignedClass?._id
        ? req.user.assignedClass._id.toString()
        : req.user.assignedClass?.toString();

      console.log("🔍 Comparing:", { assignedClassId, classId });

      if (!assignedClassId || assignedClassId !== classId) {
        console.log("❌ Access denied - class mismatch");
        return res.status(403).json({
          success: false,
          error: "غير مسموح - يمكنك رؤية فصلك فقط",
        });
      }

      console.log("✅ Access granted - class matches");
    }

    // الحصول على معلومات الفصل
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        error: "الفصل غير موجود",
      });
    }

    // تحديد الفترة الزمنية
    const endDateObj = endDate ? new Date(endDate) : new Date();
    let startDateObj = startDate ? new Date(startDate) : new Date(endDateObj);

    if (!startDate) {
      switch (period) {
        case "week":
          startDateObj.setDate(startDateObj.getDate() - 7);
          break;
        case "month":
          startDateObj.setMonth(startDateObj.getMonth() - 1);
          break;
        case "quarter":
          startDateObj.setMonth(startDateObj.getMonth() - 3);
          break;
        default:
          startDateObj.setMonth(startDateObj.getMonth() - 1);
      }
    }

    const startDateStr = startDateObj.toISOString().split("T")[0];
    const endDateStr = endDateObj.toISOString().split("T")[0];

    // الحصول على الأطفال في الفصل
    const children = await Child.find({ classId }).select("name");
    const totalChildren = children.length;

    // بيانات الحضور للفصل
    const attendanceRecords = await Attendance.find({
      class: classId,
      type: "child",
      date: { $gte: startDateStr, $lte: endDateStr },
    })
      .populate("person", "name")
      .sort({ date: 1 });

    // تحليل البيانات حسب الطفل
    const childrenAnalysis = {};
    children.forEach((child) => {
      childrenAnalysis[child._id] = {
        childId: child._id,
        name: child.name,
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        attendanceRate: 0,
        consecutiveAbsent: 0,
        lastAttendance: null,
      };
    });

    // تحليل السجلات
    const sessionDates = [...new Set(attendanceRecords.map((r) => r.date))];

    attendanceRecords.forEach((record) => {
      const childId = record.person._id.toString();
      if (childrenAnalysis[childId]) {
        if (record.status === "present") {
          childrenAnalysis[childId].presentCount++;
          childrenAnalysis[childId].lastAttendance = record.date;
        } else {
          childrenAnalysis[childId].absentCount++;
        }
      }
    });

    // حساب معدلات الحضور والغياب المتتالي
    Object.values(childrenAnalysis).forEach((child) => {
      const totalRecords = child.presentCount + child.absentCount;
      child.attendanceRate =
        totalRecords > 0
          ? Math.round((child.presentCount / totalRecords) * 100)
          : 0;
      child.totalSessions = sessionDates.length;

      // حساب الغياب المتتالي
      const recentRecords = attendanceRecords
        .filter((r) => r.person._id.toString() === child.childId.toString())
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

      let consecutiveCount = 0;
      for (const record of recentRecords) {
        if (record.status === "absent") {
          consecutiveCount++;
        } else {
          break;
        }
      }
      child.consecutiveAbsent = consecutiveCount;
    });

    // إحصائيات عامة للفصل
    const presentTotal = attendanceRecords.filter(
      (r) => r.status === "present"
    ).length;
    const absentTotal = attendanceRecords.filter(
      (r) => r.status === "absent"
    ).length;
    const totalRecords = presentTotal + absentTotal;
    const classAttendanceRate =
      totalRecords > 0 ? (presentTotal / totalRecords) * 100 : 0;

    console.log(`📊 Individual class data generated for: ${classInfo.name}`);
    console.log(
      `📊 Total children: ${totalChildren}, Total sessions: ${sessionDates.length}`
    );
    console.log(`📊 Attendance records: ${attendanceRecords.length}`);

    const response = {
      success: true,
      data: {
        classInfo: {
          id: classInfo._id,
          name: classInfo.name,
          category: classInfo.category || "غير محدد",
          totalChildren,
        },
        period: {
          start: startDateStr,
          end: endDateStr,
          totalSessions: sessionDates.length,
        },
        overallStats: {
          totalRecords,
          presentTotal,
          absentTotal,
          attendanceRate: Math.round(classAttendanceRate * 100) / 100,
          avgAttendancePerSession:
            sessionDates.length > 0
              ? Math.round((presentTotal / sessionDates.length) * 100) / 100
              : 0,
        },
        childrenAnalysis: Object.values(childrenAnalysis),
        sessionDates,
      },
    };

    console.log("✅ Sending individual class response");
    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching individual class statistics:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع إحصائيات الفصل",
    });
  }
});

// @route   GET /api/advanced-statistics/church
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

    // Get total servants count (only servants, not classTeachers)
    const totalServants = await User.countDocuments({
      role: "servant",
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

module.exports = router;
