const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Class = require("../models/Class");
const { authMiddleware, adminOnly, adminOrServiceLeader } = require("../middleware/auth");
const { zonedTimeToUtc, utcToZonedTime, format } = require('date-fns-tz');
const { subDays, getDay } = require('date-fns');

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

// Helper function to get Friday dates going back N weeks using date-fns-tz
const getFridayDatesBack = (weeksBack) => {
  const fridays = [];
  const timeZone = 'Africa/Cairo';
  
  // 1. Get the current date and time in the Cairo time zone.
  const now = new Date();
  let cairoNow = utcToZonedTime(now, timeZone);

  // 2. Find the most recent Friday.
  // In date-fns, Sunday is 0, Monday is 1, ..., Friday is 5, Saturday is 6.
  let daysToSubtract = (getDay(cairoNow) - 5 + 7) % 7;
  let mostRecentFriday = subDays(cairoNow, daysToSubtract);

  // 3. Generate Friday dates for the past N weeks.
  for (let i = 0; i < weeksBack; i++) {
    const friday = subDays(mostRecentFriday, i * 7);
    // 4. Format the date to YYYY-MM-DD string.
    fridays.push(format(friday, 'yyyy-MM-dd', { timeZone }));
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
      .select("-password")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: servants,
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

// SERVANTS STATISTICS ROUTES - MUST COME BEFORE /:id ROUTE

// @route   GET /api/servants/statistics/general
// @desc    Get general servants statistics
// @access  Protected (Admin only)
router.get("/statistics/general", authMiddleware, adminOnly, async (req, res) => {
  try {
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
    
    res.json({
      success: true,
      data: {
        totalServants,
        presentToday: todayPresent,
        attendanceRate: parseFloat(attendanceRate),
        averageAttendance,
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
// @desc    Get individual servants statistics
// @access  Protected (Admin only)
router.get("/statistics/individual", authMiddleware, adminOnly, async (req, res) => {
  try {
    const servants = await User.find({ role: "servant" })
      .select("name phone")
      .sort({ name: 1 });
    
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
        };
      })
    );
    
    res.json({
      success: true,
      data: servantsWithStats,
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
// @access  Protected (Admin only)
router.get("/statistics/follow-up", authMiddleware, adminOnly, async (req, res) => {
  try {
    console.log("🔍 Servants follow-up API called by:", req.user.name, req.user.role);
    
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

// @route   POST /api/servants
// @desc    Create new servant
// @access  Protected (Admin only)
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Name is required",
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
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          error: "Phone number already exists",
        });
      }
    }

    const servant = new User({
      name,
      username,
      password: "servant123", // Default password
      phone: phone || "",
      role: "servant",
    });

    await servant.save();

    res.status(201).json({
      success: true,
      data: {
        _id: servant._id,
        name: servant.name,
        username: servant.username,
        phone: servant.phone,
        role: servant.role,
      },
      message: "Servant created successfully",
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
    const { name, phone } = req.body;

    const servant = await User.findById(req.params.id);
    if (!servant || servant.role !== "servant") {
      return res.status(404).json({
        success: false,
        error: "Servant not found",
      });
    }

    // Check if phone already exists for other users
    if (phone && phone !== servant.phone) {
      const existingPhone = await User.findOne({
        phone,
        _id: { $ne: req.params.id },
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          error: "Phone number already exists",
        });
      }
    }

    // Update servant fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    const updatedServant = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      data: updatedServant,
      message: "Servant updated successfully",
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
        error: "Servant not found",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Servant deleted successfully",
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
