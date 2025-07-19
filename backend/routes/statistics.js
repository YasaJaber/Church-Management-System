const express = require("express");
const Child = require("../models/Child");
const Attendance = require("../models/Attendance");
const Class = require("../models/Class");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Helper function to get the most recent Friday
const getMostRecentFriday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
  let daysAgo;

  if (dayOfWeek === 5) {
    // Today is Friday
    daysAgo = 0;
  } else if (dayOfWeek > 5) {
    // Saturday (6) = 1 day ago
    daysAgo = dayOfWeek - 5;
  } else {
    // Sunday (0) to Thursday (4) = go back to previous Friday
    daysAgo = dayOfWeek + 2;
  }

  const friday = new Date();
  friday.setDate(friday.getDate() - daysAgo);
  return friday.toISOString().split("T")[0];
};

// Helper function to get Friday dates going back N weeks
const getFridayDatesBack = (weeksBack) => {
  const fridays = [];
  const today = new Date();

  for (let i = 0; i < weeksBack; i++) {
    const friday = new Date();
    // Find this week's Friday first
    const dayOfWeek = today.getDay();
    let daysToSubtract;

    if (dayOfWeek === 5) {
      // Today is Friday
      daysToSubtract = i * 7;
    } else if (dayOfWeek > 5) {
      // Weekend, go to last Friday
      daysToSubtract = dayOfWeek - 5 + i * 7;
    } else {
      // Weekday, go to previous Friday
      daysToSubtract = dayOfWeek + 2 + i * 7;
    }

    friday.setDate(today.getDate() - daysToSubtract);
    fridays.push(friday.toISOString().split("T")[0]);
  }

  return fridays;
};

// @route   GET /api/statistics/child/:childId
// @desc    Get detailed statistics for a specific child
// @access  Public
router.get("/child/:childId", async (req, res) => {
  try {
    const { childId } = req.params;

    // Validate ObjectId format
    if (
      !childId ||
      typeof childId !== "string" ||
      childId.length !== 24 ||
      !/^[a-fA-F0-9]{24}$/.test(childId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid child ID format",
      });
    }

    // Find the child from database
    const child = await Child.findById(childId).populate("class");
    if (!child) {
      return res.status(404).json({
        success: false,
        error: "الطفل غير موجود",
      });
    }

    // Get all attendance records for this child from database
    const childAttendance = await Attendance.find({
      person: childId,
      type: "child",
    }).sort({ date: -1 });

    // Calculate statistics
    const totalRecords = childAttendance.length;
    const presentRecords = childAttendance.filter(
      (r) => r.status === "present"
    );
    const absentRecords = childAttendance.filter((r) => r.status === "absent");

    const presentCount = presentRecords.length;
    const absentCount = absentRecords.length;

    const attendanceRate =
      totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;

    // Get dates breakdown
    const presentDates = presentRecords.map((r) => r.date).sort();
    const absentDates = absentRecords.map((r) => r.date).sort();

    // Calculate consecutive attendance streak
    const allDates = childAttendance
      .map((r) => ({ date: r.date, status: r.status }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    let currentStreak = 0;
    let maxStreak = 0;
    for (let i = allDates.length - 1; i >= 0; i--) {
      if (allDates[i].status === "present") {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        if (i === allDates.length - 1) currentStreak = 0;
        break;
      }
    }

    // Get recent activity (last 5 records)
    const recentActivity = childAttendance
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map((record) => ({
        date: record.date,
        status: record.status,
        notes: record.notes || "",
      }));

    // Calculate monthly breakdown
    const monthlyStats = {};
    childAttendance.forEach((record) => {
      const month = record.date.substring(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          present: 0,
          absent: 0,
          total: 0,
        };
      }
      monthlyStats[month][record.status]++;
      monthlyStats[month].total++;
    });

    const monthlyBreakdown = Object.keys(monthlyStats)
      .sort()
      .map((month) => ({
        month,
        monthName: new Date(month + "-01").toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
        }),
        ...monthlyStats[month],
        rate:
          monthlyStats[month].total > 0
            ? (
                (monthlyStats[month].present / monthlyStats[month].total) *
                100
              ).toFixed(1)
            : 0,
      }));

    res.json({
      success: true,
      data: {
        child: {
          _id: child._id,
          name: child.name,
          age: child.age,
          class: child.class,
          parentName: child.parentName,
          phone: child.phone,
          notes: child.notes,
        },
        summary: {
          totalRecords,
          presentCount,
          absentCount,
          attendanceRate: parseFloat(attendanceRate),
          currentStreak,
          maxStreak,
        },
        dates: {
          presentDates,
          absentDates,
        },
        recentActivity,
        monthlyBreakdown,
        allRecords: childAttendance.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        ),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم",
    });
  }
});

// @route   GET /api/statistics/church
// @desc    Get general church statistics
// @access  Protected
router.get("/church", authMiddleware, async (req, res) => {
  try {
    console.log("Church stats API called");
    console.log("User:", req.user?.name, "Role:", req.user?.role);

    let totalChildren,
      classId = null;

    // Role-based access
    if (req.user.role === "admin") {
      // Admin gets all church statistics
      totalChildren = await Child.countDocuments({ isActive: true });
    } else if (req.user.role === "servant" && req.user.assignedClass) {
      // Servant gets only their class statistics
      totalChildren = await Child.countDocuments({
        class: req.user.assignedClass._id,
        isActive: true,
      });
      classId = req.user.assignedClass._id;
    } else {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    const totalClasses =
      req.user.role === "admin"
        ? await Class.countDocuments({ isActive: true })
        : 1; // Servant sees only their class

    // Get the most recent Friday (Sunday School day)
    const todayFriday = getMostRecentFriday();

    // Get today's attendance
    let attendanceQuery = {
      date: todayFriday,
      type: "child",
    };

    if (classId) {
      // Get children in the servant's class
      const classChildren = await Child.find({ class: classId });
      const childIds = classChildren.map((child) => child._id);
      attendanceQuery.person = { $in: childIds };
    }

    const todayAttendance = await Attendance.find(attendanceQuery);

    const presentToday = todayAttendance.filter(
      (record) => record.status === "present"
    ).length;
    const absentToday = todayAttendance.filter(
      (record) => record.status === "absent"
    ).length;

    // Calculate average attendance over the last 12 weeks (3 months)
    const fridayDates = getFridayDatesBack(12);

    let recentAttendanceQuery = {
      date: { $in: fridayDates },
      type: "child",
    };

    if (classId) {
      const classChildren = await Child.find({ class: classId });
      const childIds = classChildren.map((child) => child._id);
      recentAttendanceQuery.person = { $in: childIds };
    }

    const recentAttendance = await Attendance.find(recentAttendanceQuery);

    const totalRecentPresent = recentAttendance.filter(
      (record) => record.status === "present"
    ).length;
    const totalRecentRecords = recentAttendance.length;

    // Calculate consistent attendees (present in 80% of last 8 weeks)
    const last8Weeks = getFridayDatesBack(8);
    const last8WeeksAttendance = await Attendance.find({
      date: { $in: last8Weeks },
      type: "child",
    });

    // Group by child and count present days
    const childAttendanceMap = {};
    last8WeeksAttendance.forEach((record) => {
      const childId = record.person.toString();
      if (!childAttendanceMap[childId]) {
        childAttendanceMap[childId] = { present: 0, total: 0 };
      }
      childAttendanceMap[childId].total++;
      if (record.status === "present") {
        childAttendanceMap[childId].present++;
      }
    });

    const consistentCount = Object.values(childAttendanceMap).filter(
      (child) => child.total > 0 && child.present / child.total >= 0.8
    ).length;

    // Calculate attendance rate based on today's records only
    const todayTotalRecords = presentToday + absentToday;
    const todayAttendanceRate =
      todayTotalRecords > 0
        ? ((presentToday / todayTotalRecords) * 100).toFixed(1)
        : "0";

    res.json({
      success: true,
      data: {
        totalChildren,
        totalClasses,
        presentToday,
        absentToday,
        attendanceRate: todayAttendanceRate,
        averageAttendance:
          totalRecentRecords > 0
            ? ((totalRecentPresent / totalRecentRecords) * 100).toFixed(1)
            : "0",
        todayPresent: presentToday,
        consecutiveCount: consistentCount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/statistics/class/:classId
// @desc    Get statistics for specific class (with permission check)
// @access  Protected
router.get("/class/:classId", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;

    // Validate ObjectId format
    if (
      !classId ||
      typeof classId !== "string" ||
      classId.length !== 24 ||
      !/^[a-fA-F0-9]{24}$/.test(classId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid class ID format",
      });
    }

    // Check if user has permission to view this class
    if (
      req.user.role !== "admin" &&
      (!req.user.assignedClass ||
        req.user.assignedClass._id.toString() !== classId)
    ) {
      return res.status(403).json({
        success: false,
        error:
          "Access denied. You can only view statistics for your assigned class.",
      });
    }

    // Get children in this class from database
    const classChildren = await Child.find({
      class: classId,
      isActive: true,
    });

    if (classChildren.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Class not found or has no children",
      });
    }

    // Get the most recent Friday (Sunday School day)
    const todayFriday = getMostRecentFriday();

    // Get child IDs for this class
    const childIds = classChildren.map((child) => child._id);

    // Get today's attendance for this class
    const todayAttendance = await Attendance.find({
      date: todayFriday,
      person: { $in: childIds },
      type: "child",
    });

    const presentToday = todayAttendance.filter(
      (record) => record.status === "present"
    ).length;
    const absentToday = todayAttendance.filter(
      (record) => record.status === "absent"
    ).length;

    // Calculate average attendance for this class over the last 12 weeks
    const fridayDates = getFridayDatesBack(12);

    const recentClassAttendance = await Attendance.find({
      date: { $in: fridayDates },
      person: { $in: childIds },
      type: "child",
    });

    const totalRecentPresent = recentClassAttendance.filter(
      (record) => record.status === "present"
    ).length;
    const totalRecentRecords = recentClassAttendance.length;

    // Calculate attendance rate based on today's records only
    const todayTotalRecords = presentToday + absentToday;
    const todayAttendanceRate =
      todayTotalRecords > 0
        ? ((presentToday / todayTotalRecords) * 100).toFixed(1)
        : "0";

    res.json({
      success: true,
      data: {
        totalChildren: classChildren.length,
        presentToday,
        absentToday,
        attendanceRate: todayAttendanceRate,
        averageAttendance:
          totalRecentRecords > 0
            ? ((totalRecentPresent / totalRecentRecords) * 100).toFixed(1)
            : "0",
        todayPresent: presentToday,
        consecutiveCount: 0, // Will be calculated separately
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/statistics/attendance
// @desc    Get attendance statistics for date range
// @access  Protected
router.get("/attendance", authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, classId, days } = req.query;

    // Build query for attendance records
    let attendanceQuery = { type: "child" };

    // Filter by date range if provided
    if (startDate && endDate) {
      attendanceQuery.date = { $gte: startDate, $lte: endDate };
    } else if (days) {
      // Filter by days from today (convert to weeks for Friday-only system)
      const numberOfDays = parseInt(days) || 7;
      let numberOfWeeks;
      if (numberOfDays <= 7) numberOfWeeks = 4; // "This week" = last 4 weeks
      else if (numberOfDays <= 30)
        numberOfWeeks = 8; // "This month" = last 8 weeks
      else numberOfWeeks = 12; // "This quarter" = last 12 weeks

      const fridayDates = getFridayDatesBack(numberOfWeeks);
      attendanceQuery.date = { $in: fridayDates };
    }

    // Get attendance records from database
    let filteredRecords = await Attendance.find(attendanceQuery).populate({
      path: "person",
      populate: { path: "class" },
    });

    // Filter by class if provided
    if (classId) {
      filteredRecords = filteredRecords.filter(
        (record) =>
          record.person &&
          record.person.class &&
          record.person.class._id.toString() === classId
      );
    }

    // Calculate statistics
    const totalRecords = filteredRecords.length;
    const presentCount = filteredRecords.filter(
      (record) => record.status === "present"
    ).length;
    const absentCount = filteredRecords.filter(
      (record) => record.status === "absent"
    ).length;

    // Create weekly attendance data for chart (Fridays only - مدرسة الأحد)
    const numberOfDays = parseInt(days) || 7;

    // Convert days to weeks (since we only have Fridays)
    let numberOfWeeks;
    if (numberOfDays <= 7) numberOfWeeks = 4; // "This week" = last 4 weeks
    else if (numberOfDays <= 30)
      numberOfWeeks = 8; // "This month" = last 8 weeks
    else numberOfWeeks = 12; // "This quarter" = last 12 weeks

    // Get Friday dates for the period (if not already set in query)
    let fridayDates;
    if (!startDate && !endDate) {
      fridayDates = getFridayDatesBack(numberOfWeeks);
    } else {
      // If date range provided, still get all Fridays in that range
      const allFridays = getFridayDatesBack(52); // Get last year of Fridays
      fridayDates = allFridays.filter((date) => {
        if (startDate && endDate) {
          return date >= startDate && date <= endDate;
        }
        return true;
      });
    }

    // Create weekly attendance data for chart (each Friday)
    const dailyData = [];
    fridayDates.reverse().forEach((fridayDate) => {
      const weekRecords = filteredRecords.filter((record) => {
        // Convert record date to string for comparison
        const recordDateStr = record.date.toISOString().split("T")[0];
        return recordDateStr === fridayDate;
      });

      dailyData.push({
        date: fridayDate,
        present: weekRecords.filter((record) => record.status === "present")
          .length,
        absent: weekRecords.filter((record) => record.status === "absent")
          .length,
      });
    });

    // Calculate by class statistics
    const classes = await Class.find({ isActive: true }).sort({ order: 1 });
    const byClassStats = await Promise.all(
      classes.map(async (cls) => {
        const classRecords = filteredRecords.filter(
          (record) =>
            record.person &&
            record.person.class &&
            record.person.class._id.toString() === cls._id.toString()
        );
        const classPresent = classRecords.filter(
          (record) => record.status === "present"
        ).length;

        const classChildren = await Child.find({
          class: cls._id,
          isActive: true,
        });

        const attendanceRate =
          classRecords.length > 0
            ? ((classPresent / classRecords.length) * 100).toFixed(1)
            : "0";

        return {
          _id: cls._id,
          stage: cls.stage,
          grade: cls.grade,
          totalChildren: classChildren.length,
          totalRecords: classRecords.length,
          presentCount: classPresent,
          averagePresent: `${attendanceRate}%`,
          attendanceRate: attendanceRate,
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalRecords,
        presentCount,
        absentCount,
        attendanceRate:
          totalRecords > 0
            ? ((presentCount / totalRecords) * 100).toFixed(1)
            : "0",
        daily: dailyData,
        byClass: byClassStats,
        records: filteredRecords,
        period: `آخر ${numberOfWeeks} جمعة`,
        note: "البيانات تظهر حضور مدرسة الأحد (أيام الجمعة فقط)",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/statistics/consecutive-attendance
// @desc    Get consecutive attendance data
// @access  Protected
router.get("/consecutive-attendance", authMiddleware, async (req, res) => {
  try {
    const { classId, period } = req.query;

    // Get children from database
    let childrenQuery = { isActive: true };
    if (classId) {
      childrenQuery.class = classId;
    }

    const children = await Child.find(childrenQuery).populate("class");

    // Get last 12 weeks of Friday dates
    const fridayDates = getFridayDatesBack(12);

    // Calculate consecutive attendance for each child
    const consecutiveData = await Promise.all(
      children.map(async (child) => {
        // Get attendance records for this child
        const attendanceRecords = await Attendance.find({
          person: child._id,
          date: { $in: fridayDates },
          type: "child",
        }).sort({ date: -1 });

        // Calculate consecutive weeks
        let consecutiveWeeks = 0;
        let totalPresent = 0;

        for (let i = 0; i < fridayDates.length; i++) {
          const record = attendanceRecords.find(
            (r) => r.date === fridayDates[i]
          );
          if (record && record.status === "present") {
            totalPresent++;
            if (i === consecutiveWeeks) {
              consecutiveWeeks++;
            }
          } else {
            break;
          }
        }

        const attendanceRate =
          attendanceRecords.length > 0
            ? ((totalPresent / attendanceRecords.length) * 100).toFixed(1)
            : "0";

        const lastAttendance = attendanceRecords.find(
          (r) => r.status === "present"
        );

        return {
          _id: child._id,
          child: child,
          consecutiveWeeks,
          consecutiveDays: consecutiveWeeks, // For compatibility
          attendanceRate: parseFloat(attendanceRate),
          lastAttendance: lastAttendance ? lastAttendance.date : null,
        };
      })
    );

    // Sort by consecutive weeks and attendance rate
    const sortedData = consecutiveData
      .filter((item) => item.consecutiveWeeks > 0 || item.attendanceRate > 0)
      .sort((a, b) => {
        if (b.consecutiveWeeks !== a.consecutiveWeeks) {
          return b.consecutiveWeeks - a.consecutiveWeeks;
        }
        return b.attendanceRate - a.attendanceRate;
      });

    res.json({
      success: true,
      data: sortedData.slice(0, 10), // Top 10
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/statistics/export/class/:classId
// @desc    Export class attendance to Excel
// @access  Protected
router.get("/export/class/:classId", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;

    // Get class info from database
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        error: "فصل غير موجود",
      });
    }

    // Get children in this class from database
    const classChildren = await Child.find({ class: classId });

    // Create simple attendance report with proper UTF-8 encoding
    const today = new Date().toISOString().split("T")[0];
    const todayFormatted = new Date().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Add UTF-8 BOM and proper CSV headers
    let csvData = "\uFEFF"; // UTF-8 BOM for proper Arabic display
    csvData += `"اسم الطفل","ملاحظات","${todayFormatted}"\n`;

    // Sort children by name
    classChildren.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    let totalPresent = 0;

    for (const child of classChildren) {
      // Find today's attendance for this child
      const todayAttendance = await Attendance.findOne({
        person: child._id,
        date: today,
        type: "child",
      });

      const status = todayAttendance
        ? todayAttendance.status === "present"
          ? "حاضر"
          : "غائب"
        : "غائب";

      const notes = todayAttendance ? todayAttendance.notes || "" : "";

      if (status === "حاضر") totalPresent++;

      // Proper CSV format with quotes for Arabic text
      csvData += `"${child.name}","${notes}","${status}"\n`;
    }

    // Add total at the end with proper Arabic
    csvData += `"المجموع","","${totalPresent} حاضر من ${classChildren.length}"\n`;

    res.json({
      success: true,
      data: csvData,
      message: "تم تصدير تقرير الفصل بنجاح",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ في تصدير التقرير",
    });
  }
});

// @route   GET /api/statistics/export/all
// @desc    Export all classes attendance to Excel
// @access  Protected
router.get("/export/all", authMiddleware, async (req, res) => {
  try {
    // Create attendance report for all children with proper UTF-8 encoding
    const today = new Date().toISOString().split("T")[0];
    const todayFormatted = new Date().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Add UTF-8 BOM and proper CSV headers
    let csvData = "\uFEFF"; // UTF-8 BOM for proper Arabic display
    csvData += `"اسم الطفل","الفصل","ملاحظات","${todayFormatted}"\n`;

    // Get all children from database
    const allChildren = await Child.find({}).populate("class");

    // Sort children by class then by name
    const sortedChildren = allChildren.sort((a, b) => {
      const classA = a.class
        ? `${a.class.stage} - ${a.class.grade}`
        : "غير محدد";
      const classB = b.class
        ? `${b.class.stage} - ${b.class.grade}`
        : "غير محدد";

      if (classA !== classB) {
        return classA.localeCompare(classB, "ar");
      }
      return a.name.localeCompare(b.name, "ar");
    });

    let totalPresent = 0;

    for (const child of sortedChildren) {
      // Find today's attendance for this child
      const todayAttendance = await Attendance.findOne({
        person: child._id,
        date: today,
        type: "child",
      });

      const status = todayAttendance
        ? todayAttendance.status === "present"
          ? "حاضر"
          : "غائب"
        : "غائب";

      const notes = todayAttendance ? todayAttendance.notes || "" : "";
      const className = child.class
        ? `${child.class.stage} - ${child.class.grade}`
        : "غير محدد";

      if (status === "حاضر") totalPresent++;

      // Proper CSV format with quotes for Arabic text
      csvData += `"${child.name}","${className}","${notes}","${status}"\n`;
    }

    // Add total at the end with proper Arabic
    csvData += `"المجموع","","","${totalPresent} حاضر من ${sortedChildren.length}"\n`;

    res.json({
      success: true,
      data: csvData,
      message: "تم تصدير تقرير جميع الفصول بنجاح",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ في تصدير التقرير",
    });
  }
});

// @route   GET /api/statistics/export/servants
// @desc    Export servants attendance to Excel
// @access  Public
router.get("/export/servants", async (req, res) => {
  try {
    // Mock servants attendance data with proper UTF-8 encoding
    const today = new Date();
    const todayFormatted = today.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Add UTF-8 BOM and proper CSV headers
    let csvData = "\uFEFF"; // UTF-8 BOM for proper Arabic display
    csvData += `"اسم الخادم","الفصل المسؤول عنه","التاريخ","الحالة","ملاحظات"\n`;

    // Create mock servant attendance data based on actual users
    const { users } = require("../mockData");
    const servants = users.filter((user) => user.role === "servant");

    servants.forEach((servant) => {
      const className = servant.assignedClass
        ? `${servant.assignedClass.stage} - ${servant.assignedClass.grade}`
        : "غير محدد";

      const status = Math.random() > 0.2 ? "حاضر" : "غائب"; // 80% attendance rate
      const notes = status === "غائب" ? "ظروف خاصة" : "";

      csvData += `"${servant.name}","${className}","${todayFormatted}","${status}","${notes}"\n`;
    });

    // Add summary
    const totalServants = servants.length;
    const presentServants = servants.filter(() => Math.random() > 0.2).length;
    csvData += `"المجموع","","","${presentServants} حاضر من ${totalServants}",""\n`;

    res.json({
      success: true,
      data: csvData,
      message: "تم تصدير تقرير حضور الخدام بنجاح",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ في تصدير التقرير",
    });
  }
});

module.exports = router;
