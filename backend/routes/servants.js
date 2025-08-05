const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Class = require("../models/Class");
const { authMiddleware, adminOnly, adminOrServiceLeader } = require("../middleware/auth");
const { subDays, getDay, startOfDay } = require('date-fns');

const router = express.Router();

// Helper function to get date string (YYYY-MM-DD format)
const getDateString = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
};

// Helper function to get the most recent Friday based on Cairo time
const getMostRecentFriday = () => {
  // 1. Get current date in Cairo's time zone
  const now = new Date();
  // Using en-US locale is a reliable way to get machine-readable date parts
  const cairoDate = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));

  // 2. Calculate days to subtract to get to the previous Friday
  // Day of week for Cairo (0=Sun, 1=Mon, ..., 5=Fri, 6=Sat)
  const dayOfWeek = cairoDate.getDay(); 
  const daysToSubtract = (dayOfWeek + 2) % 7;

  // 3. Calculate the date of the most recent Friday
  const fridayDate = new Date(cairoDate);
  fridayDate.setDate(cairoDate.getDate() - daysToSubtract);

  // 4. Format the date manually to YYYY-MM-DD to avoid timezone issues from .toISOString()
  const year = fridayDate.getFullYear();
  const month = String(fridayDate.getMonth() + 1).padStart(2, '0');
  const day = String(fridayDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Helper function to get Friday dates going back N weeks using simplified date logic
const getFridayDatesBack = (weeksBack) => {
  const fridays = [];
  
  // Get the current date
  const now = new Date();

  // Find the most recent Friday
  // In date-fns, Sunday is 0, Monday is 1, ..., Friday is 5, Saturday is 6.
  let daysToSubtract = (getDay(now) - 5 + 7) % 7;
  let mostRecentFriday = subDays(now, daysToSubtract);

  // Generate Friday dates for the past N weeks
  for (let i = 0; i < weeksBack; i++) {
    const friday = subDays(mostRecentFriday, i * 7);
    // Format the date to YYYY-MM-DD string
    const fridayStr = friday.toISOString().split('T')[0];
    fridays.push(fridayStr);
  }
  
  return fridays;
};

// @route   GET /api/servants
// @desc    Get all individual servants
// @access  Protected (Admin or Service Leader)
router.get("/", authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    // Find all servants (individual servants system)
    const servants = await User.find({
      role: "servant",
    })
      .select("-password -assignedClass -isActive -updatedAt -__v")
      .sort({ name: 1 });

    // Format response to match frontend expectations
    const formattedServants = servants.map(servant => ({
      _id: servant._id,
      name: servant.name,
      username: servant.username,
      phone: servant.phone,
      role: servant.role,
      createdAt: servant.createdAt,
    }));

    res.json({
      success: true,
      data: formattedServants,
      message: "نظام الخدام الفردي - كل خادم له اسمه ورقم تليفونه",
      systemType: "individual-servants",
      totalServants: servants.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// ATTENDANCE ROUTES MUST COME BEFORE /:id ROUTE TO AVOID CONFLICTS

// @route   GET /api/servants/attendance
// @desc    Get servant attendance by date
// @access  Protected (Admin or Service Leader)
router.get("/attendance", authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    console.log("🔍 Servants attendance API called");
    console.log("📅 Request query:", req.query);

    const { date } = req.query;
    const attendanceDate = date || getMostRecentFriday();
    console.log("📅 Using attendance date:", attendanceDate);

    // Get attendance for individual servants
    console.log("🔎 Searching for attendance records...");
    const attendanceRecords = await Attendance.find({
      date: attendanceDate,
      personModel: "User",
    }).populate({
      path: "person",
      match: { role: "servant" },
      select: "name phone role",
    });

    console.log("📊 Found attendance records:", attendanceRecords.length);
    console.log("📊 Raw records:", attendanceRecords);

    // Filter out null persons (non-servants)
    const filteredRecords = attendanceRecords.filter(
      (record) => record.person !== null
    );

    console.log("✅ Filtered records (servants only):", filteredRecords.length);

    res.json({
      success: true,
      data: filteredRecords,
      date: attendanceDate,
      systemType: "individual-servants",
    });
  } catch (error) {
    console.error("❌ Error in servants attendance route:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   POST /api/servants/attendance
// @desc    Mark attendance for a servant
// @access  Protected (Admin only)
router.post("/attendance", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { servantId, date, status, notes } = req.body;

    if (!servantId || !date || !status) {
      return res.status(400).json({
        success: false,
        error: "Servant ID, date, and status are required",
      });
    }

    // Find the servant
    const servant = await User.findById(servantId);
    if (!servant || servant.role !== "servant") {
      return res.status(404).json({
        success: false,
        error: "Servant not found",
      });
    }

    // Check if attendance already exists
    let attendance = await Attendance.findOne({
      person: servantId,
      personModel: "User",
      date: date,
    });

    if (attendance) {
      // Update existing attendance
      attendance.status = status;
      attendance.notes = notes || "";
      attendance.recordedBy = req.user._id;
      attendance.updatedAt = new Date();
      await attendance.save();

      console.log(`📝 Servant attendance updated:
         Servant: ${servant.name}
         Status: ${status}
         Date: ${date}
         Updated by: ${req.user._id}`);
    } else {
      // Create new attendance record
      attendance = new Attendance({
        type: "servant",
        person: servantId,
        personModel: "User",
        date: date,
        status: status,
        notes: notes || "",
        recordedBy: req.user._id,
      });
      await attendance.save();

      console.log(`📝 Servant attendance recorded:
         Servant: ${servant.name}
         Status: ${status}
         Date: ${date}
         Recorded by: ${req.user._id}`);
    }

    res.json({
      success: true,
      data: attendance,
      message: "Attendance recorded successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   POST /api/servants/attendance/mark-all-present
// @desc    Mark all servants as present for a date
// @access  Protected (Admin only)
router.post("/attendance/mark-all-present", authMiddleware, adminOnly, async (req, res) => {
  try {
    console.log("📨 Request body:", req.body);
    const { date, recordedBy } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date is required",
      });
    }
    
    // Use the provided recordedBy or fall back to the authenticated user's ID
    const recordedById = recordedBy || req.user._id;
    console.log("🔑 Using recordedById:", recordedById, "(from request:", recordedBy, ", from user:", req.user._id, ")");

    // Get all servants
    const servants = await User.find({ role: "servant" });

    const results = [];
    for (const servant of servants) {
      // Check if attendance already exists
      let attendance = await Attendance.findOne({
        person: servant._id,
        personModel: "User",
        date: date,
      });

      if (attendance) {
        // Update existing attendance
        attendance.status = "present";
        attendance.recordedBy = recordedById;
        attendance.updatedAt = new Date();
        await attendance.save();
        results.push({ servant: servant.name, action: "updated" });
      } else {
        // Create new attendance record
        attendance = new Attendance({
          type: "servant",
          person: servant._id,
          personModel: "User",
          date: date,
          status: "present",
          recordedBy: recordedById,
        });
        await attendance.save();
        results.push({ servant: servant.name, action: "created" });
      }
    }

    console.log(`📝 All servants marked present for ${date} by ${recordedById}`);

    res.json({
      success: true,
      data: results,
      message: `All ${servants.length} servants marked present for ${date}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   DELETE /api/servants/attendance
// @desc    Delete servant attendance record
// @access  Protected (Admin only)
router.delete("/attendance", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { servantId, date } = req.body;

    if (!servantId || !date) {
      return res.status(400).json({
        success: false,
        error: "Servant ID and date are required",
      });
    }

    console.log(`🗑️ Deleting attendance record for servant ${servantId} on ${date}`);

    // Find and delete the attendance record
    const deletedRecord = await Attendance.findOneAndDelete({
      person: servantId,
      personModel: "User",
      date: date,
    });

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        error: "Attendance record not found",
      });
    }

    console.log(`✅ Attendance record deleted successfully for servant ${servantId} on ${date}`);

    res.json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting servant attendance:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// SERVANTS STATISTICS ROUTES - MUST COME BEFORE /:id ROUTE

// @route   GET /api/servants/statistics/general
// @desc    Get general servants statistics with follow-up tracking
// @access  Protected (Admin or Service Leader)
router.get("/statistics/general", authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    console.log("🔍 General servants statistics API called by:", req.user.username, req.user.role);
    
    const totalServants = await User.countDocuments({ role: "servant" });
    
    // Get today's attendance count
    const today = new Date().toISOString().split("T")[0];
    const todayAttendanceRecords = await Attendance.find({
      date: today,
      personModel: "User",
      status: "present"
    }).populate({
      path: "person",
      match: { role: "servant" }
    });
    
    // Filter out null persons (only count actual servants)
    const todayPresent = todayAttendanceRecords.filter(record => record.person !== null).length;
    
    // Calculate overall attendance rate
    const totalAttendanceRecords = await Attendance.countDocuments({
      personModel: "User"
    });
    
    const presentRecords = await Attendance.countDocuments({
      personModel: "User",
      status: "present"
    });
    
    const attendanceRate = totalAttendanceRecords > 0 ? 
      ((presentRecords / totalAttendanceRecords) * 100).toFixed(1) : 0;
    
    // Calculate average weekly attendance (simplified)
    const averageAttendance = Math.round(totalServants * (attendanceRate / 100));
    
    // Calculate servants needing follow-up (3+ consecutive absences)
    const servants = await User.find({ role: "servant" }).select("_id");
    const fridayDates = getFridayDatesBack(4); // Last 4 weeks
    
    let servantsNeedingFollowUp = 0;
    
    for (const servant of servants) {
      const recentAttendance = await Attendance.find({
        person: servant._id,
        personModel: "User",
        date: { $in: fridayDates }
      }, { date: 1, status: 1 });
      
      const attendanceMap = {};
      recentAttendance.forEach(record => {
        attendanceMap[record.date] = record.status;
      });
      
      let consecutiveAbsences = 0;
      for (const fridayDate of fridayDates) {
        const status = attendanceMap[fridayDate];
        if (status === "present") {
          break;
        } else if (status === "absent" || !status) {
          consecutiveAbsences++;
        }
      }
      
      if (consecutiveAbsences >= 3) {
        servantsNeedingFollowUp++;
      }
    }
    
    console.log(`📊 General statistics: ${totalServants} total, ${todayPresent} present today, ${servantsNeedingFollowUp} need follow-up`);
    
    res.json({
      success: true,
      data: {
        totalServants,
        presentToday: todayPresent,
        attendanceRate: parseFloat(attendanceRate),
        averageAttendance,
        servantsNeedingFollowUp,
        followUpCriteria: "3+ consecutive Friday absences"
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

// @route   GET /api/servants/statistics/attendance
// @desc    Get servants attendance statistics
// @access  Protected (Admin only)
router.get("/statistics/attendance", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysBack = parseInt(days);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    
    // Get attendance records for servants in date range
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDateStr, $lte: endDateStr },
      personModel: "User",
    }).populate({
      path: "person",
      match: { role: "servant" },
      select: "name",
    });
    
    // Filter out null persons (non-servants)
    const servantAttendance = attendanceRecords.filter(
      (record) => record.person !== null
    );
    
    // Calculate statistics
    const totalRecords = servantAttendance.length;
    const presentCount = servantAttendance.filter(
      (record) => record.status === "present"
    ).length;
    const absentCount = servantAttendance.filter(
      (record) => record.status === "absent"
    ).length;
    
    // Create daily statistics for chart
    const dailyStats = {};
    servantAttendance.forEach(record => {
      if (!dailyStats[record.date]) {
        dailyStats[record.date] = { present: 0, absent: 0, total: 0 };
      }
      dailyStats[record.date][record.status]++;
      dailyStats[record.date].total++;
    });
    
    // Convert to array format for frontend
    const daily = Object.keys(dailyStats).map(date => ({
      date,
      present: dailyStats[date].present,
      absent: dailyStats[date].absent,
      total: dailyStats[date].total,
      attendanceRate: dailyStats[date].total > 0 ? 
        ((dailyStats[date].present / dailyStats[date].total) * 100).toFixed(1) : 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({
      success: true,
      data: {
        totalRecords,
        presentCount,
        absentCount,
        attendanceRate: totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0,
        dateRange: { startDate: startDateStr, endDate: endDateStr },
        daily, // Add daily statistics for chart
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

// @route   GET /api/servants/statistics/individual
// @desc    Get individual servants statistics with follow-up tracking
// @access  Protected (Admin or Service Leader)
router.get("/statistics/individual", authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    console.log("🔍 Individual servants statistics API called by:", req.user.username, req.user.role);
    
    const servants = await User.find({ role: "servant" })
      .select("name phone")
      .sort({ name: 1 });
    
    // Get Friday dates for consecutive absence check (last 4 weeks)
    const fridayDates = getFridayDatesBack(4);
    console.log("📅 Checking Friday dates:", fridayDates);
    
    // Get attendance data for each servant
    const servantsWithStats = await Promise.all(
      servants.map(async (servant) => {
        const totalAttendance = await Attendance.countDocuments({
          person: servant._id,
          personModel: "User",
        });
        
        const presentAttendance = await Attendance.countDocuments({
          person: servant._id,
          personModel: "User",
          status: "present",
        });
        
        const absentAttendance = await Attendance.countDocuments({
          person: servant._id,
          personModel: "User",
          status: "absent",
        });
        
        const lateAttendance = await Attendance.countDocuments({
          person: servant._id,
          personModel: "User",
          status: "late",
        });
        
        const attendanceRate = totalAttendance > 0 ? 
          ((presentAttendance / totalAttendance) * 100).toFixed(1) : 0;
        
        // Get recent attendance for consecutive absence check
        const recentAttendance = await Attendance.find({
          person: servant._id,
          personModel: "User",
          date: { $in: fridayDates }
        }, { date: 1, status: 1 });
        
        // Create attendance map
        const attendanceMap = {};
        recentAttendance.forEach(record => {
          attendanceMap[record.date] = record.status;
        });
        
        // Calculate consecutive absences
        let consecutiveAbsences = 0;
        for (const fridayDate of fridayDates) {
          const status = attendanceMap[fridayDate];
          if (status === "present") {
            break;
          } else if (status === "absent" || !status) {
            consecutiveAbsences++;
          }
        }
        
        return {
          _id: servant._id,
          name: servant.name,
          phone: servant.phone,
          totalAttendance,
          presentAttendance,
          presentCount: presentAttendance,
          absentCount: absentAttendance,
          lateCount: lateAttendance,
          attendanceRate: parseFloat(attendanceRate),
          consecutiveAbsences,
          needsFollowUp: consecutiveAbsences >= 3
        };
      })
    );
    
    // Count servants needing follow-up
    const servantsNeedingFollowUp = servantsWithStats.filter(s => s.needsFollowUp).length;
    
    console.log(`📊 Found ${servantsNeedingFollowUp} servants needing follow-up out of ${servants.length} total servants`);
    
    res.json({
      success: true,
      data: servantsWithStats,
      summary: {
        totalServants: servants.length,
        servantsNeedingFollowUp,
        followUpCriteria: "3+ consecutive Friday absences"
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/servants/statistics/follow-up
// @desc    Get servants requiring follow-up
// @access  Protected (Admin or Service Leader)
router.get("/statistics/follow-up", authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    console.log("🔍 Servants follow-up API called by:", req.user.username, req.user.role);
    
    const servants = await User.find({ role: "servant" })
      .select("name phone")
      .sort({ name: 1 });
    
    // Get Friday dates for the last 12 weeks (3 months)
    const fridayDates = getFridayDatesBack(12);
    console.log("📅 Friday dates (newest first):", fridayDates);
    
    const servantsNeedingFollowUp = [];
    
    for (const servant of servants) {
      console.log(`👤 Checking servant: ${servant.name}`);
      
      // Get all attendance records for this servant
      const attendanceRecords = await Attendance.find({
        person: servant._id,
        personModel: "User",
      });
      
      // Create a map of attendance by date
      const attendanceMap = {};
      attendanceRecords.forEach(record => {
        attendanceMap[record.date] = record.status;
      });
      
      console.log(`📊 Attendance map:`, attendanceMap);
      
      // Check consecutive absences starting from the most recent Friday
      let consecutiveAbsences = 0;
      let lastPresentDate = null;
      
      for (const fridayDate of fridayDates) {
        const status = attendanceMap[fridayDate];
        if (status === "present") {
          console.log(`   ✅ ${fridayDate}: present (breaking streak)`);
          if (!lastPresentDate) {
            lastPresentDate = fridayDate;
          }
          break; // Found a present record, break the streak
        } else if (status === "absent") {
          consecutiveAbsences++;
          console.log(`   ❌ ${fridayDate}: absent (consecutive: ${consecutiveAbsences})`);
        } else {
          // No record found - count as absent for follow-up purposes
          consecutiveAbsences++;
          console.log(`   ❌ ${fridayDate}: no record (consecutive: ${consecutiveAbsences})`);
        }
      }
      
      console.log(`🔢 ${servant.name}: ${consecutiveAbsences} consecutive absences${consecutiveAbsences > 0 ? ' (current streak)' : ''}`);
      
      // If 3 or more consecutive absences, add to follow-up list
      if (consecutiveAbsences >= 3) {
        servantsNeedingFollowUp.push({
          _id: servant._id,
          name: servant.name,
          phone: servant.phone,
          consecutiveAbsences,
          lastPresentDate: lastPresentDate,
        });
      }
    }
    
    console.log(`📊 Found ${servantsNeedingFollowUp.length} servants needing follow-up`);
    
    res.json({
      success: true,
      data: servantsNeedingFollowUp,
      criteria: "3+ consecutive Friday absences",
      totalServantsChecked: servants.length,
    });
  } catch (error) {
    console.error("❌ Error in servants follow-up statistics:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/servants/statistics/by-class
// @desc    Get servants statistics grouped by class for service leader
// @access  Protected (Service Leader or Admin)
router.get("/statistics/by-class", authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    console.log("🔍 Servants by class statistics API called by:", req.user.username, req.user.role);
    
    // Get all classes with their servants
    const classes = await Class.find({ isActive: true })
      .populate({
        path: 'servants',
        match: { role: "servant" },
        select: 'name phone username'
      })
      .sort({ stage: 1, order: 1, name: 1 });
    
    const classStats = [];
    
    for (const classItem of classes) {
      if (!classItem.servants || classItem.servants.length === 0) {
        // No servants assigned to this class
        classStats.push({
          class: {
            _id: classItem._id,
            name: classItem.name,
            stage: classItem.stage,
            grade: classItem.grade
          },
          totalServants: 0,
          servants: [],
          message: "لا يوجد خدام مكلفين لهذا الفصل"
        });
        continue;
      }
      
      const servantsWithStats = [];
      
      for (const servant of classItem.servants) {
        // Get servant's attendance statistics
        const totalAttendance = await Attendance.countDocuments({
          person: servant._id,
          personModel: "User",
        });
        
        const presentAttendance = await Attendance.countDocuments({
          person: servant._id,
          personModel: "User",
          status: "present",
        });
        
        const absentAttendance = await Attendance.countDocuments({
          person: servant._id,
          personModel: "User",
          status: "absent",
        });
        
        const attendanceRate = totalAttendance > 0 ? 
          ((presentAttendance / totalAttendance) * 100).toFixed(1) : 0;
        
        // Check for consecutive absences
        const fridayDates = getFridayDatesBack(4); // Last 4 weeks
        const attendanceRecords = await Attendance.find({
          person: servant._id,
          personModel: "User",
          date: { $in: fridayDates }
        });
        
        const attendanceMap = {};
        attendanceRecords.forEach(record => {
          attendanceMap[record.date] = record.status;
        });
        
        let consecutiveAbsences = 0;
        for (const fridayDate of fridayDates) {
          const status = attendanceMap[fridayDate];
          if (status === "present") {
            break;
          } else if (status === "absent" || !status) {
            consecutiveAbsences++;
          }
        }
        
        servantsWithStats.push({
          _id: servant._id,
          name: servant.name,
          phone: servant.phone,
          username: servant.username,
          totalAttendance,
          presentCount: presentAttendance,
          absentCount: absentAttendance,
          attendanceRate: parseFloat(attendanceRate),
          consecutiveAbsences,
          needsFollowUp: consecutiveAbsences >= 3
        });
      }
      
      classStats.push({
        class: {
          _id: classItem._id,
          name: classItem.name,
          stage: classItem.stage,
          grade: classItem.grade
        },
        totalServants: classItem.servants.length,
        servants: servantsWithStats,
        servantsNeedingFollowUp: servantsWithStats.filter(s => s.needsFollowUp).length
      });
    }
    
    console.log(`📊 Found statistics for ${classStats.length} classes`);
    
    res.json({
      success: true,
      data: classStats,
      message: "إحصائيات الخدام مقسمة حسب الفصول",
      totalClasses: classStats.length,
      totalServantsChecked: classStats.reduce((sum, cls) => sum + cls.totalServants, 0)
    });
  } catch (error) {
    console.error("❌ Error in servants by class statistics:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/servants/statistics/individual/:id
// @desc    Get detailed statistics for a single servant
// @access  Protected (Service Leader or Admin)
router.get("/statistics/individual/:id", authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const servantId = req.params.id;
    console.log("🔍 Individual servant statistics API called for:", servantId);
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(servantId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid servant ID format",
      });
    }
    
    // Find the servant
    const servant = await User.findById(servantId).select("-password");
    if (!servant || servant.role !== "servant") {
      return res.status(404).json({
        success: false,
        error: "Servant not found",
      });
    }
    
    // Get all attendance records for this servant
    const attendanceRecords = await Attendance.find({
      person: servantId,
      personModel: "User",
    }).sort({ date: -1 });
    
    // Calculate basic statistics
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === "present").length;
    const absentCount = attendanceRecords.filter(r => r.status === "absent").length;
    const lateCount = attendanceRecords.filter(r => r.status === "late").length;
    const attendanceRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;
    
    // Calculate consecutive attendance/absence streaks
    let currentStreak = 0;
    let maxPresentStreak = 0;
    let maxAbsentStreak = 0;
    let currentStreakType = null;
    let tempStreak = 0;
    
    // Get recent Friday dates for streak calculation
    const fridayDates = getFridayDatesBack(12);
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.date] = record.status;
    });
    
    // Calculate current streak (from most recent Friday)
    for (const fridayDate of fridayDates) {
      const status = attendanceMap[fridayDate];
      if (status === "present") {
        if (currentStreakType === null) {
          currentStreakType = "present";
          currentStreak = 1;
        } else if (currentStreakType === "present") {
          currentStreak++;
        } else {
          break;
        }
      } else if (status === "absent" || !status) {
        if (currentStreakType === null) {
          currentStreakType = "absent";
          currentStreak = 1;
        } else if (currentStreakType === "absent") {
          currentStreak++;
        } else {
          break;
        }
      } else {
        break; // Late breaks the streak
      }
    }
    
    // Calculate max streaks from historical data
    let tempPresentStreak = 0;
    let tempAbsentStreak = 0;
    
    for (const record of attendanceRecords.reverse()) {
      if (record.status === "present") {
        tempPresentStreak++;
        tempAbsentStreak = 0;
        maxPresentStreak = Math.max(maxPresentStreak, tempPresentStreak);
      } else if (record.status === "absent") {
        tempAbsentStreak++;
        tempPresentStreak = 0;
        maxAbsentStreak = Math.max(maxAbsentStreak, tempAbsentStreak);
      } else {
        tempPresentStreak = 0;
        tempAbsentStreak = 0;
      }
    }
    
    // Prepare recent activity (last 10 records)
    const recentActivity = attendanceRecords.slice(0, 10).map(record => ({
      date: record.date,
      status: record.status,
      dayName: new Date(record.date + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long' }),
      notes: record.notes || ''
    }));
    
    // Monthly breakdown for the current year
    const currentYear = new Date().getFullYear();
    const monthlyBreakdown = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthStart = `${currentYear}-${month.toString().padStart(2, '0')}-01`;
      const monthEnd = `${currentYear}-${month.toString().padStart(2, '0')}-31`;
      
      const monthRecords = attendanceRecords.filter(record => 
        record.date >= monthStart && record.date <= monthEnd
      );
      
      const monthPresent = monthRecords.filter(r => r.status === "present").length;
      const monthAbsent = monthRecords.filter(r => r.status === "absent").length;
      const monthTotal = monthRecords.length;
      const monthRate = monthTotal > 0 ? ((monthPresent / monthTotal) * 100).toFixed(1) : "0";
      
      if (monthTotal > 0) {
        monthlyBreakdown.push({
          month: month.toString().padStart(2, '0'),
          monthName: new Date(currentYear, month - 1).toLocaleDateString('ar-EG', { month: 'long' }),
          present: monthPresent,
          absent: monthAbsent,
          total: monthTotal,
          rate: monthRate
        });
      }
    }
    
    const result = {
      servant: {
        _id: servant._id,
        name: servant.name,
        phone: servant.phone,
        username: servant.username,
        createdAt: servant.createdAt
      },
      summary: {
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        attendanceRate: parseFloat(attendanceRate),
        currentStreak,
        currentStreakType,
        maxPresentStreak,
        maxAbsentStreak
      },
      dates: {
        presentDates: attendanceRecords.filter(r => r.status === "present").map(r => r.date),
        absentDates: attendanceRecords.filter(r => r.status === "absent").map(r => r.date),
        lateDates: attendanceRecords.filter(r => r.status === "late").map(r => r.date)
      },
      recentActivity,
      monthlyBreakdown
    };
    
    console.log(`📊 Individual statistics compiled for servant: ${servant.name}`);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error in individual servant statistics:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   POST /api/servants
// @desc    Create new servant
// @access  Protected (Admin only)
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, phone, role = "servant" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "الاسم مطلوب",
      });
    }

    // Generate username from name (remove spaces, make lowercase, add timestamp for uniqueness)
    let baseUsername = name.toLowerCase().replace(/\s+/g, '');
    let username = baseUsername;
    let counter = 1;
    
    // Ensure username is unique
    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Check if phone already exists (if provided)
    if (phone && phone.trim()) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          error: "رقم الهاتف موجود بالفعل",
        });
      }
    }

    const servant = new User({
      name: name.trim(),
      username,
      password: "servant123", // Default password
      phone: phone ? phone.trim() : "",
      role: role || "servant",
      isActive: true, // Always active by default
    });

    await servant.save();

    // Return servant without password
    const servantData = {
      _id: servant._id,
      name: servant.name,
      username: servant.username,
      phone: servant.phone,
      role: servant.role,
      createdAt: servant.createdAt,
    };

    res.status(201).json({
      success: true,
      data: servantData,
      message: "تم إضافة الخادم بنجاح",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   PUT /api/servants/:id
// @desc    Update servant
// @access  Protected (Admin only)
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, phone, role } = req.body;

    const servant = await User.findById(req.params.id);
    if (!servant || servant.role !== "servant") {
      return res.status(404).json({
        success: false,
        error: "الخادم غير موجود",
      });
    }

    // Check if phone already exists for other users
    if (phone && phone.trim() && phone.trim() !== servant.phone) {
      const existingPhone = await User.findOne({
        phone: phone.trim(),
        _id: { $ne: req.params.id },
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          error: "رقم الهاتف موجود بالفعل",
        });
      }
    }

    // Update servant fields
    const updateData = {};
    if (name !== undefined && name.trim()) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : "";
    if (role !== undefined) updateData.role = role;

    const updatedServant = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select("-password");

    // Format response to match frontend expectations
    const servantData = {
      _id: updatedServant._id,
      name: updatedServant.name,
      username: updatedServant.username,
      phone: updatedServant.phone,
      role: updatedServant.role,
      createdAt: updatedServant.createdAt,
    };

    res.json({
      success: true,
      data: servantData,
      message: "تم تحديث بيانات الخادم بنجاح",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   DELETE /api/servants/:id
// @desc    Delete servant
// @access  Protected (Admin only)
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const servant = await User.findById(req.params.id);
    if (!servant || servant.role !== "servant") {
      return res.status(404).json({
        success: false,
        error: "الخادم غير موجود",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "تم حذف الخادم بنجاح",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/servants/:id
// @desc    Get single servant details
// @access  Protected (Admin only)
router.get("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    // Add a check to ensure the ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid servant ID format",
      });
    }

    const servant = await User.findById(req.params.id).select("-password");

    if (!servant || servant.role !== "servant") {
      return res.status(404).json({
        success: false,
        error: "Servant not found",
      });
    }

    res.json({
      success: true,
      data: servant,
    });
  } catch (error) {
    console.error("❌ Error in GET /api/servants/:id route:", error);
    // Check for CastError specifically
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: "Invalid ID format. Please check the servant ID.",
      });
    }
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;
