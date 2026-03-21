const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
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
// @desc    Get consecutive attendance statistics grouped by classes (OPTIMIZED with Aggregation)
// @access  Protected
router.get(
  "/consecutive-attendance-by-classes",
  authMiddleware,
  async (req, res) => {
    try {
      console.log("📊 Fetching consecutive attendance statistics by classes (OPTIMIZED)");
      console.log("👤 User role:", req.user.role);
      console.log("📚 User assigned class:", req.user.assignedClass);

      const startTime = Date.now();
      const { classId, minDays = 4 } = req.query; // Changed default from 3 to 4

      // Build class filter based on user role
      let classFilterId = null;
      if (classId) {
        classFilterId = new mongoose.Types.ObjectId(classId);
      } else if (
        req.user.role === "classTeacher" ||
        req.user.role === "servant"
      ) {
        // مدرس الفصل يشوف فصله فقط
        if (!req.user.assignedClass) {
          return res.status(403).json({
            success: false,
            error: "لم يتم تعيين فصل لك. يرجى التواصل مع المسؤول.",
          });
        }
        const assignedClassId = req.user.assignedClass._id || req.user.assignedClass;
        classFilterId = new mongoose.Types.ObjectId(assignedClassId);
        console.log("📚 Class teacher accessing their class");
      }
      // else: Admin and serviceLeader see all classes (no filter)

      // ============================================
      // OPTIMIZED: Single Aggregation Pipeline
      // ============================================
      console.log("🚀 Starting optimized aggregation pipeline...");
      console.log("🔍 Class filter:", classFilterId ? classFilterId.toString() : 'ALL CLASSES');
      
      const childrenWithData = await Child.aggregate([
        // Stage 1: Match active children in allowed classes
        {
          $match: {
            isActive: true,
            ...(classFilterId ? { class: classFilterId } : {})
          }
        },
        
        // Stage 2: Lookup attendance records (sorted by date desc)
        {
          $lookup: {
            from: 'attendances',
            let: { childId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$person', '$$childId'] },
                      { $eq: ['$type', 'child'] }
                    ]
                  }
                }
              },
              { $sort: { date: -1 } }
            ],
            as: 'attendanceRecords'
          }
        },
        
        // Stage 3: Lookup last gift delivery
        {
          $lookup: {
            from: 'giftdeliveries',
            let: { childId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$child', '$$childId'] },
                      { $eq: ['$isActive', true] }
                    ]
                  }
                }
              },
              { $sort: { deliveryDate: -1 } },
              { $limit: 1 }
            ],
            as: 'lastGift'
          }
        },
        
        // Stage 4: Lookup class information
        {
          $lookup: {
            from: 'classes',
            localField: 'class',
            foreignField: '_id',
            as: 'classInfo'
          }
        },
        
        // Stage 5: Project only needed fields
        {
          $project: {
            _id: 1,
            name: 1,
            class: 1,
            image: 1,
            thumbnail: 1,
            optimizedImage: 1,
            attendanceRecords: 1,
            lastGift: { $arrayElemAt: ['$lastGift', 0] },
            classInfo: { $arrayElemAt: ['$classInfo', 0] }
          }
        }
      ]);

      console.log(`✅ Aggregation completed in ${Date.now() - startTime}ms`);
      console.log(`📊 Fetched ${childrenWithData.length} children with all data`);
      
      // Debug: Show which classes we're processing
      const uniqueClasses = [...new Set(childrenWithData.map(c => c.class?.toString()))];
      console.log(`📚 Processing ${uniqueClasses.length} unique class(es):`, uniqueClasses);

      // ============================================
      // Calculate attendance for LAST 4 FRIDAYS (Calendar Dates)
      // (Check attendance in specific last 4 Fridays only)
      // ============================================
      
      // DEBUG: Check if we have any children
      console.log(`🔍 Processing ${childrenWithData.length} children for class ${classFilterId || 'ALL'}`);

      // Find the most recent attendance date across ALL children to use as reference
      // This handles scenarios where server time (2024) differs from data time (2025)
      let maxDateStr = new Date().toISOString().split('T')[0];
      let recordsFound = 0;
      
      for (const childData of childrenWithData) {
        if (childData.attendanceRecords && childData.attendanceRecords.length > 0) {
          recordsFound += childData.attendanceRecords.length;
          const latestRecord = childData.attendanceRecords[0]; // Already sorted desc
          if (latestRecord.date > maxDateStr) {
            maxDateStr = latestRecord.date;
          }
        }
      }
      
      console.log(`📊 Found ${recordsFound} total attendance records`);
      console.log(`📅 Reference Date (Latest Data): ${maxDateStr}`);

      // Helper function to get last N Fridays based on a reference date
      const getLastFridays = (count, referenceDateStr) => {
        const fridays = [];
        const refDate = new Date(referenceDateStr);
        let current = new Date(refDate);
        
        // Find last Friday (including today if it is Friday)
        while (current.getDay() !== 5) {
          current.setDate(current.getDate() - 1);
        }
        
        // Get last 'count' Fridays
        for (let i = 0; i < count; i++) {
          fridays.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() - 7);
        }
        
        return fridays; // Most recent first
      };

      const last4Fridays = getLastFridays(4, maxDateStr);
      console.log("📅 Last 4 Fridays calculated:", last4Fridays);
      
      const classesMap = new Map(); // Group by class
      let childrenWithResets = 0;

      for (const childData of childrenWithData) {
        const attendanceRecords = childData.attendanceRecords || [];
        
        // Get last gift date (reset marker)
        const lastGiftDate = childData.lastGift
          ? new Date(childData.lastGift.deliveryDate).toISOString().split("T")[0]
          : null;
        
        if (lastGiftDate) {
          childrenWithResets++;
        }
        
        // Create a map of dates to attendance status for quick lookup
        const attendanceMap = new Map();
        attendanceRecords.forEach(record => {
          attendanceMap.set(record.date, record.status);
        });

        // Check attendance in last 4 Fridays ONLY (but after reset date if exists)
        const fridaysAfterReset = last4Fridays.filter(friday => {
          return !lastGiftDate || friday > lastGiftDate;
        });
        
        // Count consecutive attendance from most recent Friday
        let consecutivePresent = 0;
        
        for (const friday of fridaysAfterReset) {
          const status = attendanceMap.get(friday);
          
          if (status === "present") {
            consecutivePresent++;
          } else {
            // إذا غاب أو لم يسجل، نوقف العد
            break;
          }
        }

        // Only include children who:
        // 1. Have at least 4 Fridays to check (after reset)
        // 2. Were present in ALL 4 Fridays consecutively
        if (fridaysAfterReset.length >= 4 && consecutivePresent >= parseInt(minDays)) {
          const classId = childData.class.toString();
          const className = childData.classInfo?.name || 'Unknown';

          if (!classesMap.has(classId)) {
            classesMap.set(classId, {
              classId: childData.class,
              className: className,
              children: []
            });
          }

          classesMap.get(classId).children.push({
            childId: childData._id,
            name: childData.name,
            image: childData.image || null,
            thumbnail: childData.thumbnail || null,
            optimizedImage: childData.optimizedImage || null,
            consecutiveWeeks: consecutivePresent,  // Number of consecutive Fridays attended
            totalWeeksChecked: fridaysAfterReset.length,  // How many Fridays we checked
            attendanceRate: Math.round((consecutivePresent / fridaysAfterReset.length) * 100), // Percentage
            lastResetDate: lastGiftDate || 'none'  // For debugging
          });
        }
      }

      // Convert map to array and sort
      const classesData = Array.from(classesMap.values());

      // Sort children in each class by consecutive weeks desc
      classesData.forEach(classData => {
        classData.children.sort((a, b) => b.consecutiveWeeks - a.consecutiveWeeks);
      });

      // Sort classes by number of consecutive children desc
      classesData.sort((a, b) => b.children.length - a.children.length);

      const totalTime = Date.now() - startTime;
      console.log(`✅ Total processing time: ${totalTime}ms`);
      console.log(`✅ Found ${classesData.length} classes with consecutive attendance data`);
      console.log(`🔄 Children with reset markers: ${childrenWithResets}/${childrenWithData.length}`);
      
      // Debug: Show detailed breakdown by class
      console.log('\n📊 DETAILED BREAKDOWN:');
      classesData.forEach(classData => {
        console.log(`   📚 ${classData.className} (${classData.classId}): ${classData.children.length} children`);
        classData.children.forEach(child => {
          console.log(`      - ${child.name}: ${child.consecutiveWeeks}/4 weeks (${child.attendanceRate}%)`);
        });
      });
      console.log('');

      res.json({
        success: true,
        data: classesData,
        summary: {
          totalClasses: classesData.length,
          minDays: parseInt(minDays),
          totalConsecutiveChildren: classesData.reduce(
            (sum, cls) => sum + cls.children.length,
            0
          ),
        },
        performance: {
          processingTimeMs: totalTime,
          optimized: true
        }
      });
    } catch (error) {
      console.error(
        "❌ Error fetching consecutive attendance by classes:",
        error
      );
      res.status(500).json({
        success: false,
        error: "خطأ في استرجاع إحصائيات الحضور المتتالي بالفصول",
      });
    }
  }
);

// @route   GET /api/statistics/child/:childId
// @desc    Get individual child statistics
// @access  Protected
router.get("/child/:childId", authMiddleware, async (req, res) => {
  try {
    const { childId } = req.params;
    console.log("📊 Fetching individual child statistics for:", childId);

    // Get child information
    const child = await Child.findById(childId).populate(
      "class",
      "name category"
    );

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
    const presentCount = attendanceRecords.filter(
      (record) => record.status === "present"
    ).length;
    const absentCount = attendanceRecords.filter(
      (record) => record.status === "absent"
    ).length;
    const attendanceRate =
      totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

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
    const recentAttendance = attendanceRecords.slice(0, 10).map((record) => ({
      date: record.date,
      status: record.status,
      notes: record.notes || "",
    }));

    // Calculate monthly statistics (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

    const recentRecords = attendanceRecords.filter(
      (record) => record.date >= threeMonthsAgoStr
    );
    const recentPresent = recentRecords.filter(
      (record) => record.status === "present"
    ).length;
    const recentTotal = recentRecords.length;
    const recentAttendanceRate =
      recentTotal > 0 ? Math.round((recentPresent / recentTotal) * 100) : 0;

    const response = {
      success: true,
      data: {
        child: {
          _id: child._id,
          name: child.name,
          class: child.class,
          parentName: child.parentName || "",
          phone: child.phone || "",
          notes: child.notes || "",
        },
        summary: {
          totalRecords: totalRecords,
          presentCount,
          absentCount,
          attendanceRate,
          currentStreak: consecutiveAttendance,
          maxStreak: consecutiveAttendance, // For now, use same as current
          recentAttendanceRate, // Last 3 months
          lastAttendance:
            attendanceRecords.length > 0 ? attendanceRecords[0].date : null,
        },
        recentAttendance,
      },
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
router.post(
  "/reset-consecutive-attendance",
  authMiddleware,
  async (req, res) => {
    try {
      console.log("\n" + "=".repeat(60));
      console.log("🔄 Resetting consecutive attendance");
      console.log("👤 User:", req.user.name);
      console.log("🔐 Role:", req.user.role);
      console.log("=".repeat(60));

      const { classId, resetAll } = req.body;

      // Determine which class(es) to reset
      let targetClassIds = [];
      let resetScope = "class";

      if (req.user.role === "admin" || req.user.role === "serviceLeader") {
        // Admin/Service Leader can reset any class or ALL classes
        if (resetAll && !classId) {
          // Reset ALL classes
          console.log("🔥 RESET ALL CLASSES requested");
          const allClasses = await Class.find({});
          targetClassIds = allClasses.map(c => c._id);
          resetScope = "all";
        } else if (classId) {
          // Reset specific class
          targetClassIds = [classId];
          resetScope = "single";
        } else {
          return res.status(400).json({
            success: false,
            error: "يرجى تحديد الفصل المراد إعادة تعيينه أو تفعيل إعادة التعيين للكل",
          });
        }
      } else if (
        req.user.role === "classTeacher" ||
        req.user.role === "servant"
      ) {
        // Class teacher can only reset their own class
        if (!req.user.assignedClass) {
          return res.status(403).json({
            success: false,
            error: "لم يتم تعيين فصل لك",
          });
        }
        targetClassIds = [req.user.assignedClass._id || req.user.assignedClass];
        resetScope = "single";
      } else {
        return res.status(403).json({
          success: false,
          error: "ليس لديك صلاحية لإعادة تعيين المواظبة",
        });
      }

      console.log(`📊 Reset scope: ${resetScope}`);
      console.log(`📚 Target class(es): ${targetClassIds.length} class(es)`);

      // Get all children in the target class(es)
      const children = await Child.find({
        class: { $in: targetClassIds },
        isActive: true,
      });

      console.log(`👶 Found ${children.length} children across ${targetClassIds.length} class(es)`);

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
            $lt: new Date(today.setHours(23, 59, 59, 999)),
          },
        });

        if (!existingGift) {
          giftRecords.push({
            child: child._id,
            deliveredBy: req.user.userId || req.user._id,
            consecutiveWeeksEarned: 0, // Reset marker, not actual gift
            giftType: "إعادة تعيين عداد المواظبة",
            notes: `🔄 إعادة تعيين جماعي بواسطة ${req.user.name}`,
            deliveryDate: new Date(),
            isActive: true,
          });
        }
      }

      if (giftRecords.length > 0) {
        await GiftDelivery.insertMany(giftRecords);
        console.log(
          `✅ Reset ${giftRecords.length} children's consecutive attendance (via gift records)`
        );
      }

      // Build response message based on scope
      let message;
      let responseData;

      if (resetScope === "all") {
        // Reset all classes
        message = `تم إعادة تعيين المواظبة لـ ${children.length} طفل في ${targetClassIds.length} فصل (بدون تأثير على سجل الحضور)`;
        responseData = {
          resetScope: "all",
          classesCount: targetClassIds.length,
          childrenCount: children.length,
          resetCount: giftRecords.length,
          date: today,
        };
      } else {
        // Reset single class
        const classData = await Class.findById(targetClassIds[0]);
        message = `تم إعادة تعيين المواظبة لـ ${children.length} طفل في فصل ${classData.name} (بدون تأثير على سجل الحضور)`;
        responseData = {
          resetScope: "single",
          classId: targetClassIds[0],
          className: classData.name,
          childrenCount: children.length,
          resetCount: giftRecords.length,
          date: today,
        };
      }

      console.log(`✅ Success: ${message}`);

      res.json({
        success: true,
        message: message,
        data: responseData,
      });
    } catch (error) {
      console.error("❌ Error resetting consecutive attendance:", error);
      res.status(500).json({
        success: false,
        error: "خطأ في إعادة تعيين المواظبة",
        details: error.message,
      });
    }
  }
);

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
        error: "يرجى تحديد الطفل",
      });
    }

    // Get child info
    const child = await Child.findById(childId).populate("class", "name");

    if (!child) {
      return res.status(404).json({
        success: false,
        error: "الطفل غير موجود",
      });
    }

    console.log(`👶 Child: ${child.name}`);
    console.log(`📚 Class: ${child.class?.name}`);

    // Check permissions
    if (req.user.role === "classTeacher" || req.user.role === "servant") {
      // Verify the child belongs to their class
      const assignedClassId =
        req.user.assignedClass?._id || req.user.assignedClass;
      if (
        !assignedClassId ||
        child.class?._id?.toString() !== assignedClassId.toString()
      ) {
        return res.status(403).json({
          success: false,
          error: "لا يمكنك تسليم هدية لطفل من فصل آخر",
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
      deliveryDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    });

    if (recentGift) {
      return res.status(400).json({
        success: false,
        error: "تم تسليم هدية لهذا الطفل مؤخراً",
      });
    }

    // Create gift delivery record
    const giftDelivery = await GiftDelivery.create({
      child: childId,
      deliveredBy: req.user.userId || req.user._id,
      consecutiveWeeksEarned: consecutiveCount,
      giftType: `مواظبة ${consecutiveCount} أسبوع`,
      notes: `تم التسليم بواسطة ${req.user.name}`,
    });

    console.log(`✅ Gift delivery recorded: ${giftDelivery._id}`);
    console.log(
      `🎯 The gift delivery record will act as reset point - no attendance record needed`
    );
    // Note: The gift delivery date will be used as the reset point when calculating consecutive attendance

    res.json({
      success: true,
      message: `تم تسليم الهدية لـ ${child.name} وإعادة تعيين العداد`,
      data: {
        childId: child._id,
        childName: child.name,
        consecutiveWeeks: consecutiveCount,
        deliveryDate: giftDelivery.deliveryDate,
        deliveredBy: req.user.name,
      },
    });
  } catch (error) {
    console.error("❌ Error delivering gift:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في تسليم الهدية",
      details: error.message,
    });
  }
});

module.exports = router;
