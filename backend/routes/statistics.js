const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Child = require("../models/Child");
const Class = require("../models/Class");
const User = require("../models/User");
const GiftDelivery = require("../models/GiftDelivery");
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
// @desc    Get consecutive attendance statistics grouped by classes (OPTIMIZED)
// @access  Protected
router.get("/consecutive-attendance-by-classes", authMiddleware, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("📊 Fetching consecutive attendance statistics by classes (OPTIMIZED)");
    console.log("👤 User role:", req.user.role);
    console.log("📚 User assigned class:", req.user.assignedClass);
    console.log("🔍 Query classId:", req.query.classId);
    console.log("=".repeat(60));

    const startTime = Date.now();
    const { classId, minDays = 4 } = req.query;

    // Get all classes or specific class based on user role
    let classFilter = {};
    if (classId) {
      console.log("✅ Using provided classId:", classId);
      classFilter = { _id: classId };
    } else if (req.user.role === 'classTeacher' || req.user.role === 'servant') {
      // مدرس الفصل يشوف فصله فقط
      if (!req.user.assignedClass) {
        return res.status(403).json({
          success: false,
          error: "لم يتم تعيين فصل لك. يرجى التواصل مع المسؤول."
        });
      }
      classFilter = { _id: req.user.assignedClass._id || req.user.assignedClass };
      console.log("📚 Class teacher accessing their class");
    } else {
      // Admin and serviceLeader can see all classes
      console.log("👑 Admin/ServiceLeader - fetching all classes");
      classFilter = {};
    }

    const classes = await Class.find(classFilter);
    console.log("📚 Found", classes.length, "class(es)");

    if (classes.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          totalClasses: 0,
          minDays: parseInt(minDays),
          totalConsecutiveChildren: 0
        }
      });
    }

    const classIds = classes.map(c => c._id);

    // OPTIMIZATION 1: Fetch all children at once
    console.log("⚡ Fetching all children in one query...");
    const allChildren = await Child.find({ 
      classId: { $in: classIds },
      isActive: true 
    }).lean();
    console.log("✅ Found", allChildren.length, "children");

    if (allChildren.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          totalClasses: 0,
          minDays: parseInt(minDays),
          totalConsecutiveChildren: 0
        }
      });
    }

    const childIds = allChildren.map(c => c._id);

    // OPTIMIZATION 2: Fetch all gift deliveries at once
    console.log("⚡ Fetching all gift deliveries in one query...");
    const allGifts = await GiftDelivery.find({
      child: { $in: childIds },
      isActive: true
    }).sort({ deliveryDate: -1 }).lean();
    console.log("✅ Found", allGifts.length, "gift deliveries");

    // Create a map of childId -> last gift date
    const childGiftMap = new Map();
    allGifts.forEach(gift => {
      if (!childGiftMap.has(gift.child.toString())) {
        childGiftMap.set(gift.child.toString(), new Date(gift.deliveryDate).toISOString().split('T')[0]);
      }
    });

    // OPTIMIZATION 3: Fetch all attendance records at once
    console.log("⚡ Fetching all attendance records in one query...");
    const allAttendance = await Attendance.find({
      person: { $in: childIds },
      type: "child"
    }).sort({ person: 1, date: -1 }).lean();
    console.log("✅ Found", allAttendance.length, "attendance records");

    // Create a map of childId -> attendance records
    const childAttendanceMap = new Map();
    allAttendance.forEach(record => {
      const childKey = record.person.toString();
      if (!childAttendanceMap.has(childKey)) {
        childAttendanceMap.set(childKey, []);
      }
      childAttendanceMap.get(childKey).push(record);
    });

    // Create a map of classId -> class object
    const classMap = new Map();
    classes.forEach(cls => {
      classMap.set(cls._id.toString(), cls);
    });

    // Group children by class
    const childrenByClass = new Map();
    allChildren.forEach(child => {
      const classKey = child.classId.toString();
      if (!childrenByClass.has(classKey)) {
        childrenByClass.set(classKey, []);
      }
      childrenByClass.get(classKey).push(child);
    });

    // Process each class and calculate consecutive attendance
    console.log("⚡ Processing consecutive attendance...");
    const classesData = [];

    for (const [classKey, classChildren] of childrenByClass) {
      const classObj = classMap.get(classKey);
      if (!classObj) continue;

      const consecutiveChildren = [];

      for (const child of classChildren) {
        const childKey = child._id.toString();
        const lastGiftDate = childGiftMap.get(childKey);
        const attendanceRecords = childAttendanceMap.get(childKey) || [];

        // Calculate consecutive attendance from the most recent date
        let consecutiveCount = 0;

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
            consecutiveWeeks: consecutiveCount,
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
          children: consecutiveChildren,
        });
      }
    }

    // Sort classes by number of consecutive children desc
    classesData.sort((a, b) => b.children.length - a.children.length);

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log(`✅ Found ${classesData.length} classes with consecutive attendance data`);
    console.log(`⚡ Execution time: ${executionTime}ms`);

    res.json({
      success: true,
      data: classesData,
      summary: {
        totalClasses: classesData.length,
        minDays: parseInt(minDays),
        totalConsecutiveChildren: classesData.reduce((sum, cls) => sum + cls.children.length, 0),
        executionTimeMs: executionTime
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
      classId: targetClassId,
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
    const child = await Child.findById(childId).populate('classId', 'name');
    
    if (!child) {
      return res.status(404).json({
        success: false,
        error: "الطفل غير موجود"
      });
    }

    console.log(`👶 Child: ${child.name}`);
    console.log(`📚 Class: ${child.classId?.name}`);

    // Check permissions
    if (req.user.role === 'classTeacher' || req.user.role === 'servant') {
      // Verify the child belongs to their class
      const assignedClassId = req.user.assignedClass?._id || req.user.assignedClass;
      if (!assignedClassId || child.classId?._id?.toString() !== assignedClassId.toString()) {
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
    console.log(`🎯 The gift delivery record will act as reset point - no absence record needed`);
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
