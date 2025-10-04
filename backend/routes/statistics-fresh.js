const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Child = require("../models/Child");
const Class = require("../models/Class");
const User = require("../models/User");
const GiftDelivery = require("../models/GiftDelivery");
const { authMiddleware } = require("../middleware/auth");

// @route   GET /api/statistics/church
// @desc    Get church-wide statistics for dashboard (Fresh Version)
// @access  Protected
router.get("/church", authMiddleware, async (req, res) => {
  try {
    console.log("🏛️ Fetching fresh church statistics for dashboard");
    console.log("👤 User role:", req.user.role);

    // Get today's date as string (YYYY-MM-DD format)
    const today = new Date().toISOString().split("T")[0];
    console.log("📅 Today's date:", today);

    // Role-based statistics - simplified logic
    let filterQuery = {};

    if (req.user.role === "admin" || req.user.role === "serviceLeader") {
      // Admin and Service Leader see all church statistics
      console.log("👑 Admin/ServiceLeader - showing all church statistics");
      // No filter - show all data
    } else if (
      (req.user.role === "classTeacher" || req.user.role === "servant") &&
      req.user.assignedClass
    ) {
      // Class teachers and servants see only their class statistics
      console.log(
        "👤 ClassTeacher/Servant - showing class statistics for:",
        req.user.assignedClass
      );
      filterQuery = { class: req.user.assignedClass };
    } else {
      // No permissions
      console.log("❌ Invalid role or no assigned class");
      return res.status(403).json({
        success: false,
        error: "غير مسموح - لا توجد صلاحيات كافية",
      });
    }

    // Get statistics based on role
    const totalChildren = await Child.countDocuments({
      ...filterQuery,
      isActive: true,
    });

    const totalClasses =
      req.user.role === "admin" || req.user.role === "serviceLeader"
        ? await Class.countDocuments()
        : 1; // Class teachers see only their class

    const servantQuery =
      req.user.role === "admin" || req.user.role === "serviceLeader"
        ? { role: "servant" }
        : {
            role: "servant",
            assignedClass: req.user.assignedClass,
          };

    const totalServants = await User.countDocuments(servantQuery);

    // Get today's attendance records
    const attendanceQuery = {
      date: today,
      type: "child",
      ...filterQuery,
    };

    const todaysAttendance = await Attendance.find(attendanceQuery);

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

    // Calculate attendance rate with improved logic
    let attendanceRate = 0;
    if (totalTodayRecords > 0) {
      attendanceRate = Math.round((presentToday / totalTodayRecords) * 100);
    } else {
      // If no attendance data for today, get last 7 days average
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];

      const weekAttendance = await Attendance.find({
        date: { $gte: weekAgoStr, $lte: today },
        type: "child",
        ...filterQuery,
      });

      const weekPresent = weekAttendance.filter(
        (r) => r.status === "present"
      ).length;
      const weekTotal = weekAttendance.length;

      if (weekTotal > 0) {
        attendanceRate = Math.round((weekPresent / weekTotal) * 100);
      }
    }

    console.log("📈 Attendance rate:", attendanceRate + "%");

    // Additional insights
    const insights = {
      attendanceStatus:
        attendanceRate >= 80
          ? "ممتاز"
          : attendanceRate >= 60
          ? "جيد"
          : "يحتاج تحسين",
      todayStatus:
        totalTodayRecords > 0 ? "تم تسجيل الحضور" : "لم يتم تسجيل الحضور بعد",
    };

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
        insights,
        userRole: req.user.role,
        isClassSpecific:
          req.user.role === "classTeacher" || req.user.role === "servant",
      },
    };

    console.log("✅ Sending fresh church statistics:", response.data);
    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching fresh church statistics:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع إحصائيات الكنيسة",
      details: error.message,
    });
  }
});

// @route   GET /api/statistics/attendance-overview
// @desc    Get attendance overview for the last 30 days
// @access  Protected
router.get("/attendance-overview", authMiddleware, async (req, res) => {
  try {
    console.log("📊 Fetching attendance overview");

    const { days = 30 } = req.query;
    const daysBack = parseInt(days);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

    // Role-based filtering
    let filterQuery = {};
    if (req.user.role === "classTeacher" || req.user.role === "servant") {
      if (req.user.assignedClass) {
        filterQuery.class = req.user.assignedClass;
      } else {
        return res.status(403).json({
          success: false,
          error: "لا توجد فصل مخصص لك",
        });
      }
    }

    // Get attendance data for the period
    const attendanceData = await Attendance.find({
      date: { $gte: startDateStr, $lte: endDateStr },
      type: "child",
      ...filterQuery,
    })
      .populate("person", "name")
      .populate("class", "name");

    // Group by date
    const dailyStats = {};
    attendanceData.forEach((record) => {
      const date = record.date;
      if (!dailyStats[date]) {
        dailyStats[date] = { present: 0, absent: 0, total: 0 };
      }
      dailyStats[date][record.status]++;
      dailyStats[date].total++;
    });

    // Convert to array and calculate rates
    const dailyArray = Object.keys(dailyStats)
      .map((date) => ({
        date,
        present: dailyStats[date].present,
        absent: dailyStats[date].absent,
        total: dailyStats[date].total,
        rate:
          dailyStats[date].total > 0
            ? Math.round(
                (dailyStats[date].present / dailyStats[date].total) * 100
              )
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate overall statistics
    const totalRecords = attendanceData.length;
    const totalPresent = attendanceData.filter(
      (r) => r.status === "present"
    ).length;
    const overallRate =
      totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

    console.log(
      `✅ Processed ${totalRecords} attendance records over ${daysBack} days`
    );

    res.json({
      success: true,
      data: {
        period: {
          startDate: startDateStr,
          endDate: endDateStr,
          days: daysBack,
        },
        daily: dailyArray,
        summary: {
          totalRecords,
          totalPresent,
          totalAbsent: totalRecords - totalPresent,
          overallRate,
          daysWithData: dailyArray.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching attendance overview:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع ملخص الحضور",
      details: error.message,
    });
  }
});

// @route   GET /api/statistics/children-by-class
// @desc    Get children count by class
// @access  Protected
router.get("/children-by-class", authMiddleware, async (req, res) => {
  try {
    console.log("📊 Fetching children count by class");

    // Role-based filtering
    let classFilter = {};
    if (req.user.role === "classTeacher" || req.user.role === "servant") {
      if (req.user.assignedClass) {
        classFilter._id = req.user.assignedClass;
      } else {
        return res.status(403).json({
          success: false,
          error: "لا توجد فصل مخصص لك",
        });
      }
    }

    // Get all classes with children count
    const classes = await Class.find(classFilter).select(
      "name category stage grade"
    );

    const classStats = [];
    for (const classItem of classes) {
      const activeChildren = await Child.countDocuments({
        class: classItem._id,
        isActive: true,
      });

      const inactiveChildren = await Child.countDocuments({
        class: classItem._id,
        isActive: false,
      });

      classStats.push({
        classId: classItem._id,
        name: classItem.name,
        category: classItem.category,
        stage: classItem.stage,
        grade: classItem.grade,
        activeChildren,
        inactiveChildren,
        totalChildren: activeChildren + inactiveChildren,
      });
    }

    // Sort by total children descending
    classStats.sort((a, b) => b.totalChildren - a.totalChildren);

    console.log(`✅ Processed ${classStats.length} classes`);

    res.json({
      success: true,
      data: classStats,
      summary: {
        totalClasses: classStats.length,
        totalActiveChildren: classStats.reduce(
          (sum, c) => sum + c.activeChildren,
          0
        ),
        totalInactiveChildren: classStats.reduce(
          (sum, c) => sum + c.inactiveChildren,
          0
        ),
        grandTotal: classStats.reduce((sum, c) => sum + c.totalChildren, 0),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching children by class:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع إحصائيات الأطفال حسب الفصل",
      details: error.message,
    });
  }
});

// @route   GET /api/statistics/consecutive-attendance-by-classes
// @desc    Get consecutive attendance statistics grouped by classes
// @access  Protected
router.get("/consecutive-attendance-by-classes", authMiddleware, async (req, res) => {
  try {
    console.log("📊 Fetching consecutive attendance statistics by classes");
    console.log("👤 User role:", req.user.role);
    console.log("📚 User assigned class:", req.user.assignedClass);

    const { classId, minDays = 4 } = req.query; // Changed default from 3 to 4

    // Get all classes or specific class based on user role
    let classes;
    if (classId) {
      classes = await Class.find({ _id: classId });
    } else if (req.user.role === 'classTeacher' || req.user.role === 'servant') {
      // مدرس الفصل يشوف فصله فقط
      if (!req.user.assignedClass) {
        return res.status(403).json({
          success: false,
          error: "لم يتم تعيين فصل لك. يرجى التواصل مع المسؤول."
        });
      }
      classes = await Class.find({ _id: req.user.assignedClass._id || req.user.assignedClass });
      console.log("📚 Class teacher accessing their class:", classes[0]?.name);
    } else {
      // Admin and serviceLeader can see all classes
      classes = await Class.find({});
    }

    const classesData = [];

    for (const classObj of classes) {
      // Get children in this class
      const children = await Child.find({ 
        class: classObj._id,
        isActive: true 
      });

      const consecutiveChildren = [];

      for (const child of children) {
        // Get the last gift delivery date for this child (acts as reset point)
        const lastGift = await GiftDelivery.findOne({
          child: child._id,
          isActive: true
        }).sort({ deliveryDate: -1 });

        // Get attendance records for this child, sorted by date desc (most recent first)
        const attendanceRecords = await Attendance.find({
          person: child._id,
          type: "child",
        }).sort({ date: -1 });

        // Calculate consecutive attendance from the most recent date
        let consecutiveCount = 0;
        const lastGiftDate = lastGift ? new Date(lastGift.deliveryDate).toISOString().split('T')[0] : null;

        for (const record of attendanceRecords) {
          // If we reached a date before the last gift delivery, stop counting
          if (lastGiftDate && record.date <= lastGiftDate) {
            break;
          }

          if (record.status === "present") {
            consecutiveCount++;
          } else if (record.status === "absent") {
            // إذا غاب، نوقف العد - مش متتالي
            break;
          }
          // إذا كان excused أو أي حالة تانية، نكمل العد
        }

        // Only include children with 4+ consecutive weeks of attendance
        if (consecutiveCount >= parseInt(minDays)) {
          consecutiveChildren.push({
            childId: child._id,
            name: child.name,
            consecutiveWeeks: consecutiveCount, // Each attendance counts as a week
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

// @route   GET /api/statistics/child/:childId
// @desc    Get individual child statistics
// @access  Protected
router.get("/child/:childId", authMiddleware, async (req, res) => {
  try {
    const { childId } = req.params;
    console.log("📊 Fetching individual child statistics for:", childId);

    // Get child information
    const child = await Child.findById(childId).populate("class", "name category");
    
    if (!child) {
      return res.status(404).json({
        success: false,
        error: "الطفل غير موجود",
      });
    }

    // Get attendance records for this child
    const attendanceRecords = await Attendance.find({
      person: childId,
      type: "child",
    }).sort({ date: -1 });

    // Calculate statistics
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(record => record.status === "present").length;
    const absentCount = attendanceRecords.filter(record => record.status === "absent").length;
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    // Calculate consecutive attendance
    let consecutiveAttendance = 0;
    for (const record of attendanceRecords) {
      if (record.status === "present") {
        consecutiveAttendance++;
      } else {
        break;
      }
    }

    // Get recent attendance (last 10 records)
    const recentAttendance = attendanceRecords.slice(0, 10).map(record => ({
      date: record.date,
      status: record.status,
      notes: record.notes || ""
    }));

    // Calculate monthly statistics (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

    const recentRecords = attendanceRecords.filter(record => record.date >= threeMonthsAgoStr);
    const recentPresent = recentRecords.filter(record => record.status === "present").length;
    const recentTotal = recentRecords.length;
    const recentAttendanceRate = recentTotal > 0 ? Math.round((recentPresent / recentTotal) * 100) : 0;

    const response = {
      success: true,
      data: {
        child: {
          _id: child._id,
          name: child.name,
          class: child.class,
          parentName: child.parentName || "",
          phone: child.phone || "",
          notes: child.notes || ""
        },
        summary: {
          totalRecords: totalRecords,
          presentCount,
          absentCount,
          attendanceRate,
          currentStreak: consecutiveAttendance,
          maxStreak: consecutiveAttendance, // For now, use same as current
          recentAttendanceRate, // Last 3 months
          lastAttendance: attendanceRecords.length > 0 ? attendanceRecords[0].date : null
        },
        recentAttendance
      }
    };

    console.log(`✅ Child statistics fetched for: ${child.name}`);
    res.json(response);

  } catch (error) {
    console.error("❌ Error fetching child statistics:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع إحصائيات الطفل",
      details: error.message,
    });
  }
});

// @route   POST /api/statistics/reset-consecutive-attendance
// @desc    Reset consecutive attendance for a class (add reset marker for all children)
// @access  Protected (Admin, Service Leader, Class Teacher)
router.post("/reset-consecutive-attendance", authMiddleware, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 Resetting consecutive attendance");
    console.log("👤 User:", req.user.name);
    console.log("🔐 Role:", req.user.role);
    console.log("=".repeat(60));

    const { classId } = req.body;

    // Determine which class(es) to reset
    let targetClassId;
    
    if (req.user.role === 'admin' || req.user.role === 'serviceLeader') {
      // Admin/Service Leader can reset any class or all classes
      if (!classId) {
        return res.status(400).json({
          success: false,
          error: "يرجى تحديد الفصل المراد إعادة تعيينه"
        });
      }
      targetClassId = classId;
    } else if (req.user.role === 'classTeacher' || req.user.role === 'servant') {
      // Class teacher can only reset their own class
      if (!req.user.assignedClass) {
        return res.status(403).json({
          success: false,
          error: "لم يتم تعيين فصل لك"
        });
      }
      targetClassId = req.user.assignedClass._id || req.user.assignedClass;
    } else {
      return res.status(403).json({
        success: false,
        error: "ليس لديك صلاحية لإعادة تعيين المواظبة"
      });
    }

    // Get all children in the class
    const children = await Child.find({ 
      class: targetClassId,
      isActive: true 
    });

    console.log(`📚 Found ${children.length} children in class`);

    // Create gift delivery records for all children as reset markers
    // This doesn't affect attendance records at all - just acts as a cutoff point
    const today = new Date();
    const giftRecords = [];
    
    for (const child of children) {
      // Check if already has a gift delivery today
      const existingGift = await GiftDelivery.findOne({
        child: child._id,
        deliveryDate: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999))
        }
      });

      if (!existingGift) {
        giftRecords.push({
          child: child._id,
          deliveredBy: req.user.userId || req.user._id,
          consecutiveWeeksEarned: 0, // Reset marker, not actual gift
          giftType: "إعادة تعيين عداد المواظبة",
          notes: `🔄 إعادة تعيين جماعي بواسطة ${req.user.name}`,
          deliveryDate: new Date(),
          isActive: true
        });
      }
    }

    if (giftRecords.length > 0) {
      await GiftDelivery.insertMany(giftRecords);
      console.log(`✅ Reset ${giftRecords.length} children's consecutive attendance (via gift records)`);
    }

    // Get class name for response
    const classData = await Class.findById(targetClassId);

    res.json({
      success: true,
      message: `تم إعادة تعيين المواظبة لـ ${children.length} طفل في فصل ${classData.name} (بدون تأثير على سجل الحضور)`,
      data: {
        classId: targetClassId,
        className: classData.name,
        childrenCount: children.length,
        resetCount: giftRecords.length,
        date: today
      }
    });
  } catch (error) {
    console.error("❌ Error resetting consecutive attendance:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في إعادة تعيين المواظبة",
      details: error.message
    });
  }
});

// @route   POST /api/statistics/deliver-gift
// @desc    Mark gift as delivered and reset child's consecutive attendance
// @access  Protected (Admin, Service Leader, Class Teacher)
router.post("/deliver-gift", authMiddleware, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🎁 Delivering gift");
    console.log("👤 User:", req.user.name);
    console.log("🔐 Role:", req.user.role);
    console.log("=".repeat(60));

    const { childId } = req.body;

    if (!childId) {
      return res.status(400).json({
        success: false,
        error: "يرجى تحديد الطفل"
      });
    }

    // Get child info
    const child = await Child.findById(childId).populate('class', 'name');
    
    if (!child) {
      return res.status(404).json({
        success: false,
        error: "الطفل غير موجود"
      });
    }

    console.log(`👶 Child: ${child.name}`);
    console.log(`📚 Class: ${child.class?.name}`);

    // Check permissions
    if (req.user.role === 'classTeacher' || req.user.role === 'servant') {
      // Verify the child belongs to their class
      const assignedClassId = req.user.assignedClass?._id || req.user.assignedClass;
      if (!assignedClassId || child.class?._id?.toString() !== assignedClassId.toString()) {
        return res.status(403).json({
          success: false,
          error: "لا يمكنك تسليم هدية لطفل من فصل آخر"
        });
      }
    }

    // Calculate consecutive weeks
    const attendanceRecords = await Attendance.find({
      person: child._id,
      type: "child",
    }).sort({ date: -1 });

    let consecutiveCount = 0;
    for (const record of attendanceRecords) {
      if (record.status === "present") {
        consecutiveCount++;
      } else if (record.status === "absent" || record.status === "reset") {
        break;
      }
    }

    console.log(`📊 Consecutive weeks: ${consecutiveCount}`);

    // Check if already delivered gift recently
    const recentGift = await GiftDelivery.findOne({
      child: childId,
      deliveryDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    if (recentGift) {
      return res.status(400).json({
        success: false,
        error: "تم تسليم هدية لهذا الطفل مؤخراً"
      });
    }

    // Create gift delivery record
    const giftDelivery = await GiftDelivery.create({
      child: childId,
      deliveredBy: req.user.userId || req.user._id,
      consecutiveWeeksEarned: consecutiveCount,
      giftType: `مواظبة ${consecutiveCount} أسبوع`,
      notes: `تم التسليم بواسطة ${req.user.name}`
    });

    console.log(`✅ Gift delivery recorded: ${giftDelivery._id}`);
    console.log(`🎯 The gift delivery record will act as reset point - no attendance record needed`);
    // Note: The gift delivery date will be used as the reset point when calculating consecutive attendance

    res.json({
      success: true,
      message: `تم تسليم الهدية لـ ${child.name} وإعادة تعيين العداد`,
      data: {
        childId: child._id,
        childName: child.name,
        consecutiveWeeks: consecutiveCount,
        deliveryDate: giftDelivery.deliveryDate,
        deliveredBy: req.user.name
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
