const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Child = require("../models/Child");
const Class = require("../models/Class");
const User = require("../models/User");
const GiftDelivery = require("../models/GiftDelivery");
const { authMiddleware } = require("../middleware/auth");

// @route   POST /api/statistics/clear-cache
// @desc    Clear statistics cache for troubleshooting
// @access  Protected
router.post("/clear-cache", authMiddleware, async (req, res) => {
  try {
    console.log("🧹 Clearing statistics cache");
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");

    // Return success response
    res.json({
      success: true,
      message: "Cache cleared successfully. Please refresh the app.",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في مسح الذاكرة المؤقتة"
    });
  }
});

// Helper function to safely convert date to Date object
const safeParseDate = (dateValue) => {
  if (!dateValue) return new Date();
  
  if (typeof dateValue === 'string') {
    // Try to parse different string formats
    if (dateValue.includes('GMT') || dateValue.includes('T')) {
      // Full date string format
      return new Date(dateValue);
    } else {
      // YYYY-MM-DD format
      return new Date(dateValue + 'T00:00:00Z');
    }
  } else if (dateValue instanceof Date) {
    return dateValue;
  } else {
    return new Date(dateValue);
  }
};

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

// Helper function to get the most recent attendance date
const getMostRecentAttendanceDate = async (classId = null) => {
  try {
    let query = { type: "child" };
    if (classId) {
      // Get children in the specific class first
      const childrenInClass = await Child.find({ class: classId, isActive: true });
      if (childrenInClass.length === 0) {
        return null; // No children in class
      }
      query.person = { $in: childrenInClass.map(c => c._id) };
    }

    const latestAttendance = await Attendance.findOne(query)
      .sort({ date: -1 })
      .limit(1);

    if (latestAttendance) {
      console.log(`📅 Most recent attendance date: ${latestAttendance.date} (${classId ? 'for class' : 'overall'})`);
      return latestAttendance.date;
    } else {
      console.log('⚠️ No attendance records found, falling back to most recent Friday');
      return getMostRecentFriday();
    }
  } catch (error) {
    console.error('❌ Error getting most recent attendance date:', error);
    return getMostRecentFriday();
  }
};

// Helper function to get actual attendance dates going back N periods
const getRecentAttendanceDates = async (count, classId = null) => {
  try {
    console.log(`📅 Getting last ${count} actual attendance dates${classId ? ' for class' : ''}`);
    
    let query = { type: "child" };
    if (classId) {
      const childrenInClass = await Child.find({ class: classId, isActive: true });
      query.person = { $in: childrenInClass.map(c => c._id) };
    }

    const distinctDates = await Attendance.distinct('date', query);
    
    // Sort dates in descending order and take the most recent ones
    const sortedDates = distinctDates
      .map(date => {
        if (typeof date === 'string') {
          return date;
        } else if (date instanceof Date) {
          return date.toISOString().split('T')[0];
        } else {
          return new Date(date).toISOString().split('T')[0];
        }
      })
      .sort((a, b) => new Date(b) - new Date(a))
      .slice(0, count);

    console.log(`📊 Found ${sortedDates.length} recent attendance dates:`, sortedDates);
    return sortedDates;
  } catch (error) {
    console.error('❌ Error getting recent attendance dates:', error);
    // Fallback to Friday dates if there's an error
    return getFridayDatesBack(count);
  }
};

// Helper function to get Friday dates going back N weeks (kept as fallback)
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

// @route   GET /api/statistics/combined
// @desc    Get all statistics in one request (optimized for mobile)
// @access  Public
router.get("/combined", async (req, res) => {
  console.log("📊 Getting combined statistics for faster loading");
  try {
    const { classId, days = 7 } = req.query;
    
    // Get the most recent attendance date instead of using today
    const mostRecentAttendanceDate = await getMostRecentAttendanceDate(classId);
    console.log(`📅 Using most recent attendance date: ${mostRecentAttendanceDate}`);
    
    // Prepare all promises to run in parallel
    const promises = [];
    
    // 1. General stats (church or class)
    if (classId) {
      promises.push(
        Class.findById(classId)
          .then(async (classDoc) => {
            if (!classDoc) throw new Error("Class not found");
            
            const childrenInClass = await Child.find({ 
              class: classId, 
              isActive: true 
            });
            
            // Use most recent attendance date instead of today
            const recentAttendance = await Attendance.find({
              type: "child",
              date: mostRecentAttendanceDate,
              person: { $in: childrenInClass.map(c => c._id) },
              status: "present"
            });

            return {
              totalChildren: childrenInClass.length,
              presentToday: recentAttendance.length,
              attendanceRate: childrenInClass.length > 0 
                ? Math.round((recentAttendance.length / childrenInClass.length) * 100) 
                : 0,
              averageAttendance: 0, // Will calculate if needed
              className: classDoc.name,
              lastAttendanceDate: mostRecentAttendanceDate
            };
          })
      );
    } else {
      promises.push(
        Promise.all([
          Child.countDocuments({ isActive: true }),
          Attendance.countDocuments({
            type: "child",
            date: mostRecentAttendanceDate,
            status: "present"
          })
        ]).then(([totalChildren, presentToday]) => ({
          totalChildren,
          presentToday,
          attendanceRate: totalChildren > 0 ? Math.round((presentToday / totalChildren) * 100) : 0,
          averageAttendance: 100,
          lastAttendanceDate: mostRecentAttendanceDate
        }))
      );
    }

    // 2. Attendance stats for the last N actual attendance dates
    const recentAttendanceDates = await getRecentAttendanceDates(parseInt(days), classId);
    promises.push(
      Promise.all(recentAttendanceDates.map(async (date) => {
        let query = { type: "child", date };
        
        if (classId) {
          const childrenInClass = await Child.find({ 
            class: classId, 
            isActive: true 
          });
          query.person = { $in: childrenInClass.map(c => c._id) };
        }

        const dayAttendance = await Attendance.find(query);
        
        return {
          date,
          present: dayAttendance.filter(a => a.status === "present").length,
          absent: dayAttendance.filter(a => a.status === "absent").length,
          late: dayAttendance.filter(a => a.status === "late").length,
          total: dayAttendance.length
        };
      }))
    );

    // 3. Consecutive attendance (المواظبين - 4+ weeks)
    promises.push(
      Child.find(classId ? { class: classId, isActive: true } : { isActive: true })
        .limit(50) // Limit for performance
        .then(children => 
          Promise.all(children.slice(0, 10).map(async (child) => {
            // Check for last 4 actual attendance dates for proper consecutive attendance
            const recentAttendanceDates = await getRecentAttendanceDates(4, classId);
            const attendanceRecords = await Attendance.find({
              type: "child",
              person: child._id,
              date: { $in: recentAttendanceDates },
            }).sort({ date: -1 });

            // Count consecutive present days from most recent
            let consecutiveCount = 0;
            for (const record of attendanceRecords) {
              if (record.status === "present") {
                consecutiveCount++;
              } else {
                break;
              }
            }

            return {
              name: child.name,
              consecutiveWeeks: consecutiveCount,
              className: child.stage || "غير محدد"
            };
          }))
        )
    );

    // Execute all promises in parallel
    const [generalStats, attendanceStats, consecutiveAttendance] = await Promise.all(promises);

    console.log("✅ Combined statistics calculated successfully");
    res.json({
      success: true,
      data: {
        general: generalStats,
        attendance: attendanceStats,
        consecutive: consecutiveAttendance.filter(c => c.consecutiveWeeks >= 4) // 4+ weeks only
      }
    });

  } catch (error) {
    console.error("❌ Error getting combined statistics:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ في جلب الإحصائيات المجمعة"
    });
  }
});

// @route   GET /api/statistics/child/:childId
// @desc    Get detailed statistics for a specific child
// @access  Public
router.get("/child/:childId", async (req, res) => {
  console.log("🔍 FRESH STATS: Received request for child statistics. childId:", req.params.childId);
  try {
    const { childId } = req.params;

    // Validate ObjectId format
    if (
      !childId ||
      typeof childId !== "string" ||
      childId.length !== 24 ||
      !/^[a-fA-F0-9]{24}$/.test(childId)
    ) {
      console.error("Invalid child ID format received:", childId);
      return res.status(400).json({
        success: false,
        error: "Invalid child ID format",
      });
    }
    console.log("Child ID validated successfully:", childId);

    // Find the child from database
    const child = await Child.findById(childId).populate("class");
    if (!child) {
      console.error("Child not found for ID:", childId);
      return res.status(404).json({
        success: false,
        error: "الطفل غير موجود",
      });
    }

    // Get all attendance records for this child from database
    console.log("Child found:", child.name, "Class:", child.class?.name);
    const childAttendance = await Attendance.find({
      person: childId,
      type: "child",
    }).sort({ date: -1 });
    console.log("Number of attendance records found:", childAttendance.length);

    // Debug the attendance records
    console.log("First few attendance records:");
    childAttendance.slice(0, 3).forEach((record, index) => {
      console.log(`  ${index + 1}. Date: ${record.date} (${typeof record.date}), Status: ${record.status}`);
    });

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
      .sort((a, b) => safeParseDate(a.date) - safeParseDate(b.date));

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
    console.log("Getting recent activity...");
    const recentActivity = childAttendance
      .sort((a, b) => safeParseDate(b.date) - safeParseDate(a.date))
      .slice(0, 5)
      .map((record) => {
        console.log("Processing record for recent activity:", { date: record.date, type: typeof record.date });
        return {
          date: record.date,
          status: record.status,
          notes: record.notes || "",
        };
      });

    // Calculate monthly breakdown
    console.log("Calculating monthly breakdown...");
    const monthlyStats = {};
    childAttendance.forEach((record) => {
      console.log("Processing record for monthly breakdown:", { date: record.date, type: typeof record.date });
      
      const dateObj = safeParseDate(record.date);
      
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date found:', record.date);
        return; // Skip this record if date is invalid
      }
      
      const month = dateObj.toISOString().substring(0, 7); // YYYY-MM
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

    console.log("Successfully calculated child statistics.");
    res.json({
      success: true,
      data: {
        child: {
          _id: child._id,
          name: child.name,
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
      },
    });
  } catch (error) {
    console.error("🚨 Error fetching child statistics:", error.message);
    console.error("🚨 Error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم",
      details: error.message,
    });
  }
});

// @route   GET /api/statistics/church
// @desc    Get church statistics (role-based filtering)
// @access  Protected (requires authentication)
router.get("/church", authMiddleware, async (req, res) => {
  try {
    console.log("📊 Getting church statistics");
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("🏫 Assigned Class:", req.user?.assignedClass || "NONE");

    let classId = null;
    
    // Apply role-based filtering
    if (req.user.role === "admin") {
      // Admin sees all church statistics
      console.log("👑 Admin access - showing church-wide statistics");
    } else if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      // Servant or Class Teacher sees only their class statistics
      classId = req.user.assignedClass._id.toString();
      console.log("👤 Servant/ClassTeacher access - filtering by class:", classId);
    } else {
      console.log("❌ Access denied - role:", req.user.role, "assignedClass:", req.user.assignedClass);
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // If filtering by class, get class-specific statistics
    if (classId) {
      console.log("📊 Getting class-specific statistics for class:", classId);
      
      // Get class information
      const classInfo = await Class.findById(classId);
      if (!classInfo) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      // Get children in this class
      const children = await Child.find({ class: classId, isActive: true });
      const totalChildren = children.length;
      
      console.log(`👥 Found ${totalChildren} children in class: ${classInfo.stage} - ${classInfo.grade}`);

      if (totalChildren === 0) {
        return res.json({
          success: true,
          data: {
            totalChildren: 0,
            presentToday: 0,
            attendanceRate: 0,
            averageAttendance: 0,
            className: `${classInfo.stage} - ${classInfo.grade}`,
          },
        });
      }

      // Get most recent attendance date for this class
      const mostRecentAttendanceDate = await getMostRecentAttendanceDate(classId);
      console.log(`📅 Using most recent attendance date: ${mostRecentAttendanceDate}`);
      
      const todayAttendance = await Attendance.find({
        date: mostRecentAttendanceDate,
        type: "child",
        person: { $in: children.map(c => c._id) },
      });

      const presentToday = todayAttendance.filter(a => a.status === "present").length;
      const absentToday = todayAttendance.filter(a => a.status === "absent").length;

      // Calculate attendance rate for the most recent date - FIX: Use children.length not totalRecords
      const attendanceRate = children.length > 0 ? 
        Math.round((presentToday / children.length) * 100) : 0;

      // Calculate average attendance over last 12 actual attendance dates for this class
      const last12AttendanceDates = await getRecentAttendanceDates(12, classId);
      
      // Calculate average attendance properly: sum all present days / (total dates * total children)
      let totalPresentSum = 0;
      let datesWithData = 0;
      
      for (const attendanceDate of last12AttendanceDates) {
        const dateAttendance = await Attendance.find({
          date: attendanceDate,
          type: "child",
          person: { $in: children.map(c => c._id) },
        });
        
        if (dateAttendance.length > 0) {
          const presentCount = dateAttendance.filter(r => r.status === "present").length;
          totalPresentSum += presentCount;
          datesWithData++;
        }
      }

      const averageAttendance = datesWithData > 0 && children.length > 0 ? 
        parseFloat(((totalPresentSum / datesWithData) / children.length * 100).toFixed(1)) : 0;

      console.log(`📊 Class statistics calculated (based on ${mostRecentAttendanceDate}):`, {
        totalChildren,
        presentToday,
        absentToday,
        attendanceRate,
        averageAttendance,
      });

      return res.json({
        success: true,
        data: {
          totalChildren,
          presentToday,
          absentToday,
          attendanceRate,
          averageAttendance,
          className: `${classInfo.stage} - ${classInfo.grade}`,
        },
      });
    }

    // Admin - Get church-wide statistics
    console.log("📊 Getting church-wide statistics");

    // Get total children count
    const totalChildren = await Child.countDocuments({ isActive: true });

    // Get most recent attendance date (overall)
    const mostRecentAttendanceDate = await getMostRecentAttendanceDate();
    console.log(`📅 Using most recent attendance date for church stats: ${mostRecentAttendanceDate}`);
    
    const todayAttendance = await Attendance.find({
      date: mostRecentAttendanceDate,
      type: "child",
    });

    const presentToday = todayAttendance.filter(
      (r) => r.status === "present"
    ).length;

    const absentToday = todayAttendance.filter(
      (r) => r.status === "absent"
    ).length;

    // Calculate attendance rate for the most recent date - FIX: Use totalChildren not totalRecords
    const attendanceRate = totalChildren > 0 ? 
      ((presentToday / totalChildren) * 100).toFixed(1) : "0";

    // Calculate average attendance over last 12 weeks using actual attendance dates
    const last12Dates = await getRecentAttendanceDates(12);
    let totalPresentSum = 0;
    let datesWithData = 0;
    
    for (const date of last12Dates) {
      const dateAttendance = await Attendance.find({
        date: date,
        type: "child",
      });
      
      if (dateAttendance.length > 0) {
        const presentCount = dateAttendance.filter(r => r.status === "present").length;
        totalPresentSum += presentCount;
        datesWithData++;
      }
    }

    const averageAttendance = datesWithData > 0 && totalChildren > 0 ? 
      ((totalPresentSum / datesWithData) / totalChildren * 100).toFixed(1) : "0";

    // For admin and service leaders, include total classes and servants counts
    let totalClasses = 0;
    let totalServants = 0;
    
    if (req.user.role === "admin" || req.user.role === "serviceLeader") {
      totalClasses = await Class.countDocuments();
      totalServants = await User.countDocuments({ role: "servant" });
      console.log(`📊 Additional stats for admin/serviceLeader: ${totalClasses} classes, ${totalServants} servants`);
    }

    console.log(`📊 Church statistics calculated (based on ${mostRecentAttendanceDate}):`, {
      totalChildren,
      presentToday,
      absentToday,
      attendanceRate: parseFloat(attendanceRate),
      averageAttendance: parseFloat(averageAttendance),
      totalClasses,
      totalServants,
    });

    res.json({
      success: true,
      data: {
        totalChildren,
        presentToday,
        absentToday,
        averageAttendance: parseFloat(averageAttendance),
        attendanceRate: parseFloat(attendanceRate),
        totalClasses,
        totalServants,
      },
    });
  } catch (error) {
    console.error("Error fetching church statistics:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم",
      details: error.message,
    });
  }
});

// @route   GET /api/statistics/attendance
// @desc    Get attendance statistics over time (role-based filtering)
// @access  Protected
router.get("/attendance", authMiddleware, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    console.log(`📊 Getting attendance stats for last ${days} days`);
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("🏫 Assigned Class:", req.user?.assignedClass || "NONE");

    // Get the last N actual attendance dates instead of assumed Fridays
    const attendanceDates = await getRecentAttendanceDates(parseInt(days));
    console.log("📅 Actual attendance dates:", attendanceDates);

    const attendanceData = [];
    let classId = null;

    // Apply role-based filtering
    if (req.user.role === "admin") {
      console.log("👑 Admin access - showing church-wide attendance stats");
    } else if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      classId = req.user.assignedClass._id.toString();
      console.log("👤 Servant/ClassTeacher access - filtering by class:", classId);
    } else {
      console.log("❌ Access denied - invalid role or no assigned class");
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only view attendance for your assigned class.",
      });
    }

    for (const date of attendanceDates) {
      let query = {
        date: date,
        type: "child",
      };

      // If user is not admin, filter by their assigned class
      if (classId) {
        const childrenInClass = await Child.find({ 
          class: classId, 
          isActive: true 
        });
        query.person = { $in: childrenInClass.map(c => c._id) };
      }

      const dayAttendance = await Attendance.find(query);

      const present = dayAttendance.filter(r => r.status === "present").length;
      const absent = dayAttendance.filter(r => r.status === "absent").length;
      const late = dayAttendance.filter(r => r.status === "late").length;

      attendanceData.push({
        date,
        present,
        absent,
        late,
        total: present + absent + late,
      });
    }

    console.log(`📊 Attendance data calculated for ${classId ? 'class' : 'church'}:`, attendanceData.length, "records");

    res.json({
      success: true,
      data: attendanceData.reverse(), // Show oldest to newest
    });
  } catch (error) {
    console.error("Error fetching attendance statistics:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم",
      details: error.message,
    });
  }
});

// @route   GET /api/statistics/consecutive-attendance
// @desc    Get consecutive attendance statistics (role-based filtering) - OPTIMIZED
// @access  Protected
router.get("/consecutive-attendance", authMiddleware, async (req, res) => {
  try {
    console.log("📊 Getting consecutive attendance stats - OPTIMIZED VERSION");
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("🏫 Assigned Class:", req.user?.assignedClass || "NONE");

    const { classId } = req.query;
    console.log("🔍 Requested classId filter:", classId);

    let childrenQuery = {};
    
    // Apply role-based filtering
    if (req.user.role === "admin" || req.user.role === "serviceLeader") {
      console.log("👑 Admin/ServiceLeader access - showing church-wide consecutive attendance");
      // إذا تم تحديد فصل معين، أضفه للفلتر
      if (classId) {
        childrenQuery.class = classId;
        console.log("🎯 Filtering by specific class:", classId);
      }
    } else if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      childrenQuery.class = req.user.assignedClass._id;
      console.log("👤 Servant/ClassTeacher access - filtering by class:", req.user.assignedClass._id);
    } else {
      console.log("❌ Access denied - invalid role or no assigned class");
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only view consecutive attendance for your assigned class.",
      });
    }

    console.log("🔍 Final children query:", JSON.stringify(childrenQuery));

    // OPTIMIZATION: Get last 4 dates ONCE instead of for each child
    const last4Dates = await getRecentAttendanceDates(4);
    console.log(`📅 Using last 4 attendance dates: ${last4Dates}`);

    // OPTIMIZATION: Get children based on role filtering
    const children = await Child.find(childrenQuery).populate('class');
    console.log(`👶 Found ${children.length} children`);

    // OPTIMIZATION: Get ALL attendance records for the last 4 dates in ONE query
    const allAttendanceRecords = await Attendance.find({
      date: { $in: last4Dates },
      type: "child",
    }).lean();
    console.log(`📊 Found ${allAttendanceRecords.length} total attendance records`);

    // OPTIMIZATION: Get ALL gift delivery records for the children in ONE query
    const allGiftDeliveries = await GiftDelivery.find({
      child: { $in: children.map(c => c._id) }
    }).lean();
    console.log(`🎁 Found ${allGiftDeliveries.length} gift delivery records`);

    // Group gift deliveries by child ID for quick lookup (get most recent delivery for each child)
    const latestGiftDeliveryByChild = {};
    allGiftDeliveries.forEach(delivery => {
      const childId = delivery.child.toString();
      if (!latestGiftDeliveryByChild[childId] || 
          new Date(delivery.deliveryDate) > new Date(latestGiftDeliveryByChild[childId].deliveryDate)) {
        latestGiftDeliveryByChild[childId] = delivery;
      }
    });

    // Group attendance by child ID for quick lookup
    const attendanceByChild = {};
    allAttendanceRecords.forEach(record => {
      const childId = record.person.toString();
      if (!attendanceByChild[childId]) {
        attendanceByChild[childId] = [];
      }
      attendanceByChild[childId].push(record);
    });

    const consecutiveStats = [];
    let processedCount = 0;

    for (const child of children) {
      try {
        const childId = child._id.toString();
        const childAttendance = attendanceByChild[childId] || [];
        const lastGiftDelivery = latestGiftDeliveryByChild[childId];
        
        // Filter attendance records to only include those AFTER the last gift delivery
        let relevantAttendance = childAttendance;
        if (lastGiftDelivery) {
          const deliveryDate = new Date(lastGiftDelivery.deliveryDate);
          relevantAttendance = childAttendance.filter(record => {
            return new Date(record.date) > deliveryDate;
          });
          console.log(`🎁 Child ${child.name} had gift delivery on ${deliveryDate.toDateString()}, filtering ${childAttendance.length} → ${relevantAttendance.length} records`);
        }
        
        // Sort by date descending
        relevantAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Count consecutive present days from most recent
        let consecutiveCount = 0;
        for (const record of relevantAttendance) {
          if (record.status === "present") {
            consecutiveCount++;
          } else {
            break;
          }
        }

        // Only include children with 4+ consecutive weeks (المواظبين)
        if (consecutiveCount >= 4) {
          consecutiveStats.push({
            name: child.name,
            consecutiveWeeks: consecutiveCount,
            className: child.class?.name || 'غير محدد',
            childId: child._id.toString(),
            lastGiftDelivery: lastGiftDelivery ? lastGiftDelivery.deliveryDate : null
          });
          
          // Debug log for first few children
          if (consecutiveStats.length <= 5) {
            console.log(`📝 المواظب: ${child.name}, Class: ${child.class?.name || 'غير محدد'}, Weeks: ${consecutiveCount}${lastGiftDelivery ? ' (after gift)' : ''}`);
          }
        }
        
        processedCount++;
        if (processedCount % 100 === 0) {
          console.log(`📊 Processed ${processedCount}/${children.length} children`);
        }
      } catch (childError) {
        console.error(`❌ Error processing child ${child.name}:`, childError.message);
        continue;
      }
    }

    console.log(`✅ Finished processing all ${processedCount} children`);
    console.log(`📊 Found ${consecutiveStats.length} children with consecutive attendance`);

    // Sort by consecutive weeks descending
    consecutiveStats.sort((a, b) => b.consecutiveWeeks - a.consecutiveWeeks);

    res.json({
      success: true,
      data: consecutiveStats, // جميع النتائج
    });
  } catch (error) {
    console.error("Error fetching consecutive attendance:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم",
      details: error.message,
    });
  }
});

// @route   GET /api/statistics/class/:classId
// @desc    Get class-specific statistics (role-based access)
// @access  Protected
router.get("/class/:classId", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;
    console.log(`📊 Getting class statistics for class ID: ${classId}`);
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("🏫 Assigned Class:", req.user?.assignedClass || "NONE");

    // Role-based access control
    if (req.user.role !== "admin") {
      // Non-admin users can only access their assigned class
      if (!req.user.assignedClass || req.user.assignedClass._id.toString() !== classId) {
        console.log("❌ Access denied - trying to access class:", classId, "but assigned to:", req.user.assignedClass?._id);
        return res.status(403).json({
          success: false,
          error: "Access denied. You can only view statistics for your assigned class.",
        });
      }
    }

    // Validate classId
    if (!classId || classId.length !== 24 || !/^[a-fA-F0-9]{24}$/.test(classId)) {
      return res.status(400).json({
        success: false,
        error: "معرف الفصل غير صالح",
      });
    }

    // Find the class
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        error: "الفصل غير موجود",
      });
    }

    // Get all children in this class
    const children = await Child.find({ class: classId });
    const totalChildren = children.length;
    
    console.log(`👥 Found ${totalChildren} children in class: ${classInfo.stage} - ${classInfo.grade}`);

    if (totalChildren === 0) {
      return res.json({
        success: true,
        data: {
          totalChildren: 0,
          presentToday: 0,
          attendanceRate: 0,
          averageAttendance: 0,
          className: `${classInfo.stage} - ${classInfo.grade}`,
        },
      });
    }

    // Get most recent attendance date for this class
    const mostRecentAttendanceDate = await getMostRecentAttendanceDate(classId);
    console.log(`📅 Using most recent attendance date for class: ${mostRecentAttendanceDate}`);
    
    const todayAttendance = await Attendance.find({
      date: mostRecentAttendanceDate,
      type: "child",
      person: { $in: children.map(c => c._id) },
    });

    const presentToday = todayAttendance.filter(a => a.status === "present").length;

    // Calculate overall attendance rate for this class
    const allAttendance = await Attendance.find({
      type: "child",
      person: { $in: children.map(c => c._id) },
    });

    const totalRecords = allAttendance.length;
    const presentRecords = allAttendance.filter(a => a.status === "present").length;
    const attendanceRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

    // Calculate average weekly attendance (last 7 weeks using actual attendance dates)
    const attendanceDates = await getRecentAttendanceDates(7);
    let totalWeeklyPresent = 0;
    
    for (const date of attendanceDates) {
      const weekAttendance = await Attendance.find({
        date: date,
        type: "child",
        person: { $in: children.map(c => c._id) },
        status: "present",
      });
      totalWeeklyPresent += weekAttendance.length;
    }

    const averageAttendance = attendanceDates.length > 0 ? 
      Math.round((totalWeeklyPresent / attendanceDates.length / totalChildren) * 100) : 0;

    console.log(`📊 Class statistics calculated:`, {
      totalChildren,
      presentToday,
      attendanceRate,
      averageAttendance,
    });

    res.json({
      success: true,
      data: {
        totalChildren,
        presentToday,
        attendanceRate,
        averageAttendance,
        className: `${classInfo.stage} - ${classInfo.grade}`,
      },
    });
  } catch (error) {
    console.error("Error fetching class statistics:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم",
      details: error.message,
    });
  }
});

// @route   GET /api/statistics/export-attendance
// @desc    Export attendance data for PDF generation
// @access  Protected
router.get("/export-attendance", authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, classId } = req.query;
    
    console.log("📊 Export attendance request:", { startDate, endDate, classId });
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "تواريخ البداية والنهاية مطلوبة"
      });
    }

    // Build match criteria
    const matchCriteria = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (classId && classId !== 'all') {
      matchCriteria.classId = classId;
    }

    // Get attendance data with populated information
    const attendanceData = await Attendance.find(matchCriteria)
      .populate('classId', 'name')
      .populate('presentChildren.childId', 'name')
      .populate('absentChildren.childId', 'name')
      .sort({ date: -1 })
      .lean();

    console.log(`📊 Found ${attendanceData.length} attendance records`);

    // Format the data for PDF export
    const formattedData = attendanceData.map(record => ({
      date: record.date,
      className: record.classId?.name || 'Unknown Class',
      presentCount: record.presentChildren?.length || 0,
      absentCount: record.absentChildren?.length || 0,
      totalChildren: (record.presentChildren?.length || 0) + (record.absentChildren?.length || 0),
      presentChildren: record.presentChildren?.map(child => ({
        name: child.childId?.name || 'Unknown Child',
        hasExcuse: child.hasExcuse || false,
        excuse: child.excuse || ''
      })) || [],
      absentChildren: record.absentChildren?.map(child => ({
        name: child.childId?.name || 'Unknown Child',
        hasExcuse: child.hasExcuse || false,
        excuse: child.excuse || ''
      })) || []
    }));

    res.json({
      success: true,
      data: formattedData,
      totalRecords: formattedData.length,
      period: { startDate, endDate },
      classFilter: classId === 'all' ? 'جميع الفصول' : classId
    });

  } catch (error) {
    console.error("Error exporting attendance data:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في تصدير بيانات الحضور",
      details: error.message
    });
  }
});

// @route   GET /api/statistics/export-class-attendance
// @desc    Export specific class attendance data
// @access  Protected
router.get("/export-class-attendance", authMiddleware, async (req, res) => {
  try {
    const { classId, startDate, endDate } = req.query;
    
    console.log("📊 Export class attendance API called:");
    console.log("   classId:", classId);
    console.log("   startDate:", startDate);
    console.log("   endDate:", endDate);
    
    if (!classId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "معرف الفصل وتواريخ البداية والنهاية مطلوبة"
      });
    }

    // استخدام نفس مودل Attendance المستخدم في POST
    const attendanceRecords = await Attendance.find({
      type: "child",
      class: classId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate({
      path: 'person',
      model: 'Child',
      populate: {
        path: 'class',
        model: 'Class'
      }
    })
    .populate('recordedBy', 'name')
    .sort({ date: -1 })
    .lean();

    console.log(`📊 Found ${attendanceRecords.length} attendance records`);

    // تنظيم البيانات حسب التاريخ
    const dateGroups = {};
    
    attendanceRecords.forEach(record => {
      const dateKey = typeof record.date === 'string' ? record.date : record.date.toISOString().split('T')[0];
      
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = {
          date: dateKey,
          className: record.person?.class?.name || 'Unknown Class',
          presentChildren: [],
          absentChildren: []
        };
      }
      
      const childData = {
        name: record.person?.name || 'Unknown Child',
        hasExcuse: !!record.notes,
        excuse: record.notes || ''
      };
      
      if (record.status === 'present') {
        dateGroups[dateKey].presentChildren.push(childData);
      } else {
        dateGroups[dateKey].absentChildren.push(childData);
      }
    });

    const formattedData = Object.values(dateGroups).map(group => ({
      date: group.date,
      className: group.className,
      presentCount: group.presentChildren.length,
      absentCount: group.absentChildren.length,
      totalChildren: group.presentChildren.length + group.absentChildren.length,
      presentChildren: group.presentChildren,
      absentChildren: group.absentChildren
    }));

    console.log(`📊 Formatted ${formattedData.length} date groups`);

    res.json({
      success: true,
      data: formattedData,
      totalRecords: formattedData.length,
      className: formattedData[0]?.className || 'Unknown Class'
    });

  } catch (error) {
    console.error("Error exporting class attendance:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في تصدير بيانات حضور الفصل"
    });
  }
});

// @route   GET /api/statistics/consecutive-attendance-by-classes
// @desc    Get consecutive attendance statistics grouped by classes
// @access  Protected
router.get("/consecutive-attendance-by-classes", authMiddleware, async (req, res) => {
  try {
    console.log("📊 Getting consecutive attendance stats by classes");
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");

    let childrenQuery = {};
    
    // Apply role-based filtering
    if (req.user.role === "admin" || req.user.role === "serviceLeader") {
      console.log("👑 Admin/ServiceLeader access - showing all classes");
    } else if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      childrenQuery.class = req.user.assignedClass._id;
      console.log("👤 Servant/ClassTeacher access - filtering by class:", req.user.assignedClass._id);
    } else {
      console.log("❌ Access denied - invalid role or no assigned class");
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only view consecutive attendance for your assigned class.",
      });
    }

    // Get last 4 dates
    const last4Dates = await getRecentAttendanceDates(4);
    console.log(`📅 Using last 4 attendance dates: ${last4Dates}`);

    // Get children based on role filtering
    const children = await Child.find(childrenQuery).populate('class');
    console.log(`👶 Found ${children.length} children`);

    // Get ALL attendance records for the last 4 dates
    const allAttendanceRecords = await Attendance.find({
      date: { $in: last4Dates },
      type: "child",
    }).lean();
    console.log(`📊 Found ${allAttendanceRecords.length} total attendance records`);

    // Get ALL gift delivery records for the children
    const allGiftDeliveries = await GiftDelivery.find({
      child: { $in: children.map(c => c._id) }
    }).lean();
    console.log(`🎁 Found ${allGiftDeliveries.length} gift delivery records`);

    // Group gift deliveries by child ID (get most recent delivery for each child)
    const latestGiftDeliveryByChild = {};
    allGiftDeliveries.forEach(delivery => {
      const childId = delivery.child.toString();
      if (!latestGiftDeliveryByChild[childId] || 
          new Date(delivery.deliveryDate) > new Date(latestGiftDeliveryByChild[childId].deliveryDate)) {
        latestGiftDeliveryByChild[childId] = delivery;
      }
    });

    // Group attendance by child ID
    const attendanceByChild = {};
    allAttendanceRecords.forEach(record => {
      const childId = record.person.toString();
      if (!attendanceByChild[childId]) {
        attendanceByChild[childId] = [];
      }
      attendanceByChild[childId].push(record);
    });

    // Group children by class
    const classesList = {};
    
    for (const child of children) {
      try {
        const childId = child._id.toString();
        const childAttendance = attendanceByChild[childId] || [];
        const lastGiftDelivery = latestGiftDeliveryByChild[childId];
        
        // Filter attendance records to only include those AFTER the last gift delivery
        let relevantAttendance = childAttendance;
        if (lastGiftDelivery) {
          const deliveryDate = new Date(lastGiftDelivery.deliveryDate);
          relevantAttendance = childAttendance.filter(record => {
            return new Date(record.date) > deliveryDate;
          });
          console.log(`🎁 Child ${child.name} had gift delivery on ${deliveryDate.toDateString()}, filtering ${childAttendance.length} → ${relevantAttendance.length} records`);
        }
        
        // Sort by date descending
        relevantAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Count consecutive present days from most recent
        let consecutiveCount = 0;
        for (const record of relevantAttendance) {
          if (record.status === "present") {
            consecutiveCount++;
          } else {
            break;
          }
        }

        // Only include children with 4+ consecutive weeks
        if (consecutiveCount >= 4) {
          const className = child.class?.name || 'غير محدد';
          const classId = child.class?._id || 'no-class';
          
          if (!classesList[classId]) {
            classesList[classId] = {
              className: className,
              classId: classId,
              children: []
            };
          }
          
          classesList[classId].children.push({
            name: child.name,
            consecutiveWeeks: consecutiveCount,
            childId: child._id.toString(),
            lastGiftDelivery: lastGiftDelivery ? lastGiftDelivery.deliveryDate : null
          });
        }
      } catch (childError) {
        console.error(`❌ Error processing child ${child.name}:`, childError.message);
        continue;
      }
    }

    // Sort children within each class by consecutive weeks
    Object.values(classesList).forEach(classData => {
      classData.children.sort((a, b) => b.consecutiveWeeks - a.consecutiveWeeks);
    });

    // Convert to array and sort by class name
    const classesArray = Object.values(classesList).sort((a, b) => a.className.localeCompare(b.className, 'ar'));

    console.log(`✅ Found ${classesArray.length} classes with consecutive attendance`);

    res.json({
      success: true,
      data: classesArray
    });
  } catch (error) {
    console.error("Error fetching consecutive attendance by classes:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم",
      details: error.message,
    });
  }
});

// @route   POST /api/statistics/deliver-gift
// @desc    Mark gift as delivered for a child and reset consecutive attendance count
// @access  Protected
router.post("/deliver-gift", authMiddleware, async (req, res) => {
  try {
    const { childId } = req.body;
    
    console.log("🎁 Gift delivery request for child:", childId);
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");

    // Validate childId
    if (!childId || childId.length !== 24 || !/^[a-fA-F0-9]{24}$/.test(childId)) {
      return res.status(400).json({
        success: false,
        error: "معرف الطفل غير صالح"
      });
    }

    // Find the child
    const child = await Child.findById(childId).populate('class');
    if (!child) {
      return res.status(404).json({
        success: false,
        error: "الطفل غير موجود"
      });
    }

    // Role-based access control
    if (req.user.role !== "admin" && req.user.role !== "serviceLeader") {
      // Check if teacher/servant has access to this child's class
      if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
        if (!child.class || child.class._id.toString() !== req.user.assignedClass._id.toString()) {
          console.log("❌ Access denied - child not in assigned class");
          return res.status(403).json({
            success: false,
            error: "لا يمكنك تسليم هدية لطفل خارج فصلك"
          });
        }
      } else {
        console.log("❌ Access denied - invalid role or no assigned class");
        return res.status(403).json({
          success: false,
          error: "غير مسموح لك بتسليم الهدايا"
        });
      }
    }

    // Get the most recent attendance date and check current consecutive weeks
    const last4Dates = await getRecentAttendanceDates(4);
    const childAttendance = await Attendance.find({
      person: childId,
      type: "child",
      date: { $in: last4Dates }
    }).sort({ date: -1 });

    // Count current consecutive weeks
    let consecutiveWeeks = 0;
    for (const record of childAttendance) {
      if (record.status === "present") {
        consecutiveWeeks++;
      } else {
        break;
      }
    }

    if (consecutiveWeeks < 4) {
      return res.status(400).json({
        success: false,
        error: `الطفل ${child.name} ليس مواظب لـ 4 أسابيع متتالية (حالياً ${consecutiveWeeks} أسابيع فقط)`
      });
    }

    // Create gift delivery record
    const giftDelivery = new GiftDelivery({
      child: childId,
      deliveredBy: req.user._id,
      consecutiveWeeksEarned: consecutiveWeeks,
      notes: `تم تسليم الهدية لمواظبة ${consecutiveWeeks} أسابيع متتالية`
    });

    await giftDelivery.save();

    // Update child's notes
    const currentNotes = child.notes || '';
    const giftNote = `🎁 تم تسليم الهدية بتاريخ ${new Date().toLocaleDateString('ar-EG')} بواسطة ${req.user.name || req.user.username} (${consecutiveWeeks} أسابيع)`;
    const updatedNotes = currentNotes ? `${currentNotes}\n${giftNote}` : giftNote;
    
    await Child.findByIdAndUpdate(childId, {
      notes: updatedNotes,
      lastGiftDelivery: new Date()
    });

    console.log(`🎁 Gift delivered successfully for child: ${child.name} (${consecutiveWeeks} weeks)`);
    console.log(`📝 Gift delivery recorded with ID: ${giftDelivery._id}`);

    res.json({
      success: true,
      message: `تم تسليم الهدية لـ ${child.name} بنجاح! 🎁\n(مواظبة ${consecutiveWeeks} أسابيع متتالية)\nسيبدأ العد من جديد الآن.`,
      data: {
        childName: child.name,
        className: child.class?.name || 'غير محدد',
        deliveredBy: req.user.name || req.user.username,
        consecutiveWeeksEarned: consecutiveWeeks,
        deliveryDate: new Date().toISOString(),
        giftDeliveryId: giftDelivery._id
      }
    });

  } catch (error) {
    console.error("❌ Error delivering gift:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في تسليم الهدية",
      details: error.message
    });
  }
});

module.exports = router;
