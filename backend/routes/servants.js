const express = require("express");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Class = require("../models/Class");
const { authMiddleware, adminOnly } = require("../middleware/auth");

const router = express.Router();

// Helper function to get date string (YYYY-MM-DD format)
const getDateString = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
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

// @route   GET /api/servants
// @desc    Get all individual servants
// @access  Protected (Admin only)
router.get("/", authMiddleware, adminOnly, async (req, res) => {
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

// @route   GET /api/servants/:id
// @desc    Get single servant details
// @access  Protected (Admin only)
router.get("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
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
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   POST /api/servants
// @desc    Add new individual servant
// @access  Protected (Admin only)
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, username, password, phone } = req.body;

    if (!name || !username || !password || !phone) {
      return res.status(400).json({
        success: false,
        error: "Name, username, password, and phone are required",
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Username already exists",
      });
    }

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        error: "Phone number already exists",
      });
    }

    // Create new servant
    const newServant = new User({
      username,
      password, // Will be automatically hashed by the model's pre-save middleware
      name,
      phone,
      role: "servant",
      assignedClass: null, // Individual servants don't have assigned classes
    });

    await newServant.save();

    // Remove password from response
    const servantResponse = newServant.toObject();
    delete servantResponse.password;

    res.status(201).json({
      success: true,
      data: servantResponse,
      message: "Servant added successfully",
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
// @desc    Update servant information
// @access  Protected (Admin only)
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, username, phone, password } = req.body;

    const servant = await User.findById(req.params.id);
    if (!servant || servant.role !== "servant") {
      return res.status(404).json({
        success: false,
        error: "Servant not found",
      });
    }

    // Check if username already exists for other users
    if (username && username !== servant.username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Username already exists",
        });
      }
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
    if (username !== undefined) updateData.username = username;
    if (phone !== undefined) updateData.phone = phone;

    // Handle password update separately to ensure it gets hashed
    if (password) {
      updateData.password = password;
    }

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

// @route   GET /api/servants/attendance
// @desc    Get servant attendance by date
// @access  Protected (Admin only)
router.get("/attendance", authMiddleware, adminOnly, async (req, res) => {
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

    // Parse date to midnight UTC for consistency with stored data
    const attendanceDate = new Date(date + "T00:00:00.000Z"); // Midnight UTC

    // Check if attendance already exists
    let attendanceRecord = await Attendance.findOne({
      person: servantId,
      date: attendanceDate,
      personModel: "User",
    });

    if (attendanceRecord) {
      // Update existing record
      attendanceRecord.status = status;
      attendanceRecord.notes = notes || "";
      attendanceRecord.recordedBy = req.user._id;
      await attendanceRecord.save();
    } else {
      // Create new record
      attendanceRecord = new Attendance({
        person: servantId,
        personModel: "User",
        date: attendanceDate,
        status: status,
        type: "servant",
        notes: notes || "",
        recordedBy: req.user._id,
      });
      await attendanceRecord.save();
    }

    await attendanceRecord.populate("person", "name phone role");

    res.json({
      success: true,
      data: attendanceRecord,
      message: "Servant attendance marked successfully",
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
// @desc    Mark all individual servants as present for a date
// @access  Protected (Admin only)
router.post(
  "/attendance/mark-all-present",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { date } = req.body;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: "Date is required",
        });
      }

      // Get all individual servants
      const servants = await User.find({ role: "servant" });

      if (servants.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No servants found",
        });
      }

      // Parse date to midnight UTC for consistency with stored data
      const attendanceDate = new Date(date + "T00:00:00.000Z"); // Midnight UTC

      // Mark attendance for each servant
      let updatedCount = 0;
      for (const servant of servants) {
        let attendanceRecord = await Attendance.findOne({
          person: servant._id,
          date: attendanceDate,
          personModel: "User",
        });

        if (attendanceRecord) {
          attendanceRecord.status = "present";
          attendanceRecord.notes = "";
          attendanceRecord.recordedBy = req.user._id;
          await attendanceRecord.save();
        } else {
          attendanceRecord = new Attendance({
            person: servant._id,
            personModel: "User",
            date: attendanceDate,
            status: "present",
            type: "servant",
            notes: "",
            recordedBy: req.user._id,
          });
          await attendanceRecord.save();
        }
        updatedCount++;
      }

      res.json({
        success: true,
        message: `Marked ${updatedCount} servants as present`,
        count: updatedCount,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// @route   GET /api/servants/:servantId/statistics
// @desc    Get statistics for a specific servant
// @access  Protected (Admin only)
router.get(
  "/:servantId/statistics",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { servantId } = req.params;

      // Find the servant
      const servant = await User.findById(servantId).select("-password");
      if (!servant || servant.role !== "servant") {
        return res.status(404).json({
          success: false,
          error: "Servant not found",
        });
      }

      // Get all attendance records for this servant
      const servantAttendance = await Attendance.find({
        person: servantId,
        personModel: "User",
      }).sort({ date: -1 });

      // Calculate statistics
      const totalRecords = servantAttendance.length;
      const presentRecords = servantAttendance.filter(
        (r) => r.status === "present"
      );
      const absentRecords = servantAttendance.filter(
        (r) => r.status === "absent"
      );
      const lateRecords = servantAttendance.filter((r) => r.status === "late");

      const presentCount = presentRecords.length;
      const absentCount = absentRecords.length;
      const lateCount = lateRecords.length;

      const attendanceRate =
        totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;

      res.json({
        success: true,
        data: {
          servant: servant,
          summary: {
            totalRecords,
            presentCount,
            absentCount,
            lateCount,
            attendanceRate: parseFloat(attendanceRate),
          },
          recentRecords: servantAttendance.slice(0, 10),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// @route   GET /api/servants/statistics/general
// @desc    Get general statistics for all individual servants
// @access  Protected (Admin only)
router.get(
  "/statistics/general",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const servants = await User.find({ role: "servant" });
      const totalServants = servants.length;

      // Get most recent Friday attendance
      const mostRecentFriday = getMostRecentFriday();
      const todayAttendance = await Attendance.find({
        date: mostRecentFriday,
        personModel: "User",
      }).populate({
        path: "person",
        match: { role: "servant" },
      });

      const presentToday = todayAttendance.filter(
        (record) =>
          record.person &&
          (record.status === "present" || record.status === "late")
      ).length;

      // Calculate average attendance over the last 12 weeks (3 months)
      const last12Fridays = getFridayDatesBack(12);
      const recentAttendance = await Attendance.find({
        date: { $in: last12Fridays },
        personModel: "User",
      }).populate({
        path: "person",
        match: { role: "servant" },
      });

      const filteredRecentAttendance = recentAttendance.filter(
        (record) => record.person
      );
      const totalRecentPresent = filteredRecentAttendance.filter(
        (record) => record.status === "present" || record.status === "late"
      ).length;
      const totalRecentRecords = filteredRecentAttendance.length;

      const averageAttendance =
        totalRecentRecords > 0
          ? ((totalRecentPresent / totalRecentRecords) * 100).toFixed(1)
          : "0";

      res.json({
        success: true,
        data: {
          totalServants,
          presentToday,
          averageAttendance: parseFloat(averageAttendance),
          consistentCount: 0, // This would require more complex calculation
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// @route   GET /api/servants/statistics/attendance
// @desc    Get attendance statistics for a period
// @access  Protected (Admin only)
router.get(
  "/statistics/attendance",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { days = 7 } = req.query;

      // Convert days to weeks (since we only have Fridays)
      let numberOfWeeks;
      if (days <= 7) numberOfWeeks = 4; // "This week" = last 4 weeks
      else if (days <= 30) numberOfWeeks = 8; // "This month" = last 8 weeks
      else numberOfWeeks = 12; // "This quarter" = last 12 weeks

      // Get Friday dates for the period
      const fridayDates = getFridayDatesBack(numberOfWeeks);

      // Create weekly attendance data for chart (each Friday)
      const weeklyData = [];

      for (const fridayDate of fridayDates.reverse()) {
        const weekRecords = await Attendance.find({
          date: fridayDate,
          personModel: "User",
        }).populate({
          path: "person",
          match: { role: "servant" },
        });

        const filteredRecords = weekRecords.filter((record) => record.person);

        weeklyData.push({
          date: fridayDate,
          present: filteredRecords.filter(
            (record) => record.status === "present"
          ).length,
          absent: filteredRecords.filter((record) => record.status === "absent")
            .length,
          late: filteredRecords.filter((record) => record.status === "late")
            .length,
        });
      }

      res.json({
        success: true,
        data: {
          daily: weeklyData, // Keep "daily" for frontend compatibility
          period: `آخر ${numberOfWeeks} جمعة`,
          note: "البيانات تظهر حضور الخدام الفرديين في مدرسة الأحد (أيام الجمعة فقط)",
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// @route   GET /api/servants/statistics/individual
// @desc    Get individual statistics for each servant
// @access  Protected (Admin only)
router.get(
  "/statistics/individual",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const servants = await User.find({ role: "servant" });

      const individualStats = [];

      for (const servant of servants) {
        const servantRecords = await Attendance.find({
          person: servant._id,
          personModel: "User",
        });

        const presentCount = servantRecords.filter(
          (r) => r.status === "present"
        ).length;
        const absentCount = servantRecords.filter(
          (r) => r.status === "absent"
        ).length;
        const lateCount = servantRecords.filter(
          (r) => r.status === "late"
        ).length;
        const totalRecords = servantRecords.length;

        const attendanceRate =
          totalRecords > 0
            ? ((presentCount / totalRecords) * 100).toFixed(1)
            : "0";

        individualStats.push({
          _id: servant._id,
          name: servant.name,
          phone: servant.phone,
          presentCount,
          absentCount,
          lateCount,
          totalRecords,
          attendanceRate: parseFloat(attendanceRate),
          note: `${totalRecords} جمعة من مدرسة الأحد`,
        });
      }

      // Sort by attendance rate
      individualStats.sort((a, b) => b.attendanceRate - a.attendanceRate);

      res.json({
        success: true,
        data: individualStats,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// @route   GET /api/servants/statistics/export
// @desc    Export detailed servants statistics report
// @access  Protected (Admin only)
router.get(
  "/statistics/export",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const servants = await User.find({ role: "servant" });
      const today = new Date();
      const todayFormatted = today.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      // Add UTF-8 BOM and proper CSV headers
      let csvData = "\uFEFF"; // UTF-8 BOM for proper Arabic display
      csvData += `"اسم الخادم","رقم التليفون","إجمالي الحضور","حاضر","غائب","متأخر","نسبة الحضور","آخر حضور"\n`;

      for (const servant of servants) {
        const servantRecords = await Attendance.find({
          person: servant._id,
          personModel: "User",
        }).sort({ date: -1 });

        const presentCount = servantRecords.filter(
          (r) => r.status === "present"
        ).length;
        const absentCount = servantRecords.filter(
          (r) => r.status === "absent"
        ).length;
        const lateCount = servantRecords.filter(
          (r) => r.status === "late"
        ).length;
        const totalRecords = servantRecords.length;

        const attendanceRate =
          totalRecords > 0
            ? ((presentCount / totalRecords) * 100).toFixed(1)
            : "0";

        // Find last attendance date
        const lastRecord = servantRecords[0];
        const lastAttendance = lastRecord
          ? new Date(lastRecord.date).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
          : "لم يسجل حضور";

        csvData += `"${servant.name}","${servant.phone}","${totalRecords}","${presentCount}","${absentCount}","${lateCount}","${attendanceRate}%","${lastAttendance}"\n`;
      }

      // Add summary statistics
      const totalServants = servants.length;
      const allRecords = await Attendance.find({
        personModel: "User",
      }).populate({
        path: "person",
        match: { role: "servant" },
      });

      const filteredRecords = allRecords.filter((record) => record.person);
      const totalRecords = filteredRecords.length;
      const totalPresent = filteredRecords.filter(
        (r) => r.status === "present"
      ).length;
      const overallRate =
        totalRecords > 0
          ? ((totalPresent / totalRecords) * 100).toFixed(1)
          : "0";

      csvData += `\n"إحصائيات عامة","","","","","","",""\n`;
      csvData += `"إجمالي الخدام","${totalServants}","","","","","",""\n`;
      csvData += `"إجمالي سجلات الحضور","${totalRecords}","","","","","",""\n`;
      csvData += `"النسبة العامة للحضور","${overallRate}%","","","","","",""\n`;
      csvData += `"تاريخ التقرير","${todayFormatted}","","","","","",""\n`;

      res.json({
        success: true,
        data: csvData,
        message: "تم تصدير تقرير إحصائيات الخدام بنجاح",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ في تصدير التقرير",
      });
    }
  }
);

// @route   GET /api/servants/statistics/follow-up
// @desc    Get servants who have been absent for consecutive weeks (افتقاد الخدام)
// @access  Protected (Admin only)
router.get(
  "/statistics/follow-up",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      console.log(
        "🔍 Servants follow-up API called by:",
        req.user.name,
        req.user.role
      );

      // Get the last 12 Friday dates
      const fridayDates = getFridayDatesBack(12);
      // Sort dates from newest to oldest (most recent Friday first)
      fridayDates.sort((a, b) => new Date(b) - new Date(a));

      console.log("📅 Friday dates (newest first):", fridayDates);

      // Get all servants
      const servants = await User.find({ role: "servant" }).select("-password");

      const followUpResults = {};

      // Check each servant's consecutive absence
      for (const servant of servants) {
        // Get attendance records for this servant (sorted by date descending - newest first)
        const attendanceRecords = await Attendance.find({
          person: servant._id,
          personModel: "User",
          date: { $in: fridayDates },
        }).sort({ date: -1 });

        // Create a map of dates to status
        const attendanceMap = {};
        attendanceRecords.forEach((record) => {
          const dateStr = record.date.toISOString().split("T")[0];
          attendanceMap[dateStr] = record.status;
        });

        console.log(`👤 Checking servant: ${servant.name}`);
        console.log(`📊 Attendance map:`, attendanceMap);

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
            // This servant attended recently, so they don't need follow-up
            console.log(
              `   ✅ ${date}: present - servant attended recently, no follow-up needed`
            );
            consecutiveAbsences = 0; // Reset to 0 since they attended
            break; // Stop counting - servant is not in follow-up list
          }
        }

        console.log(
          `🔢 ${servant.name}: ${consecutiveAbsences} consecutive absences (current streak)`
        );

        // Only include servants with 2+ consecutive absences
        if (consecutiveAbsences >= 2) {
          if (!followUpResults[consecutiveAbsences]) {
            followUpResults[consecutiveAbsences] = [];
          }

          // Get the last attendance date for this servant
          const lastPresentRecord = attendanceRecords.find(
            (r) => r.status === "present"
          );

          followUpResults[consecutiveAbsences].push({
            _id: servant._id,
            name: servant.name,
            phone: servant.phone,
            consecutiveAbsences,
            lastAttendance: lastPresentRecord ? lastPresentRecord.date : null,
            assignedClass: servant.assignedClass || null,
          });
        }
      }

      // Sort each group by name
      Object.keys(followUpResults).forEach((key) => {
        followUpResults[key].sort((a, b) => a.name.localeCompare(b.name, "ar"));
      });

      // Calculate summary statistics
      const totalFollowUpServants = Object.values(followUpResults).reduce(
        (sum, group) => sum + group.length,
        0
      );

      const groupSummary = Object.keys(followUpResults)
        .map((weeks) => ({
          consecutiveWeeks: parseInt(weeks),
          count: followUpResults[weeks].length,
          servants: followUpResults[weeks],
        }))
        .sort((a, b) => a.consecutiveWeeks - b.consecutiveWeeks);

      console.log(
        `📊 Found ${totalFollowUpServants} servants needing follow-up`
      );

      res.json({
        success: true,
        data: {
          summary: {
            totalFollowUpServants,
            groupsCount: Object.keys(followUpResults).length,
            userRole: req.user.role,
          },
          groups: groupSummary,
          lastUpdated: new Date(),
          note: "الخدام الذين غابوا جمعتين متتاليتين أو أكثر",
        },
      });
    } catch (error) {
      console.error("❌ Error in servants follow-up route:", error);
      res.status(500).json({
        success: false,
        error: "خطأ في الخادم",
      });
    }
  }
);

module.exports = router;
