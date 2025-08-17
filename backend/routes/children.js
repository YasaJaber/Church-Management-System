const express = require("express");
const mongoose = require("mongoose");
const Child = require("../models/Child");
const Class = require("../models/Class");
const Attendance = require("../models/Attendance");
const { authMiddleware, adminOrServiceLeader } = require("../middleware/auth");
const { subDays, getDay } = require('date-fns');

const router = express.Router();

// @route   GET /api/children
// @desc    Get all children (role-based filtering)
// @access  Protected
router.get("/", authMiddleware, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(50));
    console.log("🔍 GET /children API CALLED");
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("🏫 Assigned Class:", req.user?.assignedClass || "NONE");
    console.log("=".repeat(50));

    let childrenQuery = {};

    // Role-based access control
    if (req.user.role === "admin" || req.user.role === "serviceLeader") {
      // Admin and Service Leader see all children
      childrenQuery = {};
      console.log("👑 Admin/ServiceLeader access - showing all children");
    } else if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      // Servant or Class Teacher sees only their class children
      childrenQuery = { class: req.user.assignedClass._id };
      console.log("👤 Servant/ClassTeacher access - filtering by class:", req.user.assignedClass._id);
    } else {
      console.log("❌ Access denied - role:", req.user.role, "assignedClass:", req.user.assignedClass);
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    const children = await Child.find({ ...childrenQuery, isActive: true })
      .populate("class")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: children,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/children/class/:classId
// @desc    Get children by class (with permission check)
// @access  Protected
router.get("/class/:classId", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;

    // Check if user has permission to view this class
    if (req.user.role !== "admin" && req.user.role !== "serviceLeader") {
      if (
        !req.user.assignedClass ||
        req.user.assignedClass._id.toString() !== classId
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Access denied. You can only view children in your assigned class.",
        });
      }
    }

    const classChildren = await Child.find({ class: classId, isActive: true })
      .populate("class")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: classChildren,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/children/:id
// @desc    Get single child details (with permission check)
// @access  Protected
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const child = await Child.findById(req.params.id).populate("class");

    if (!child) {
      return res.status(404).json({
        success: false,
        error: "Child not found",
      });
    }

    // Check if user has permission to view this child
    if (req.user.role !== "admin") {
      if (
        !req.user.assignedClass ||
        child.class._id.toString() !== req.user.assignedClass._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Access denied. You can only view children in your assigned class.",
        });
      }
    }

    res.json({
      success: true,
      data: child,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   POST /api/children
// @desc    Add new child (with permission check)
// @access  Protected
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, phone, parentName, classId, notes } = req.body;

    // فقط الاسم مطلوب
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "اسم الطفل مطلوب",
      });
    }

    // تحديد الفصل تلقائياً حسب المستخدم
    let targetClassId = classId;
    if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      // المدرس والخادم يضيفان للفصل المخصص لهم
      targetClassId = req.user.assignedClass._id.toString();
      console.log(`🎯 تم تعيين الفصل تلقائياً للمستخدم ${req.user.username}: ${req.user.assignedClass.name}`);
    }

    // التحقق من وجود الفصل
    if (!targetClassId) {
      return res.status(400).json({
        success: false,
        error: "يجب تحديد الفصل",
      });
    }

    // Find the class
    const childClass = await Class.findById(targetClassId);
    if (!childClass) {
      return res.status(404).json({
        success: false,
        error: "الفصل غير موجود",
      });
    }

    // Check if user has permission to add children to this class
    if (req.user.role !== "admin") {
      if (
        !req.user.assignedClass ||
        req.user.assignedClass._id.toString() !== targetClassId.toString()
      ) {
        return res.status(403).json({
          success: false,
          error: "يمكنك فقط إضافة أطفال لفصلك المخصص",
        });
      }
    }

    // Create new child with default values
    const newChild = new Child({
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      parentName: parentName ? parentName.trim() : name.trim(), // اسم الطفل كولي أمر افتراضي
      class: targetClassId,
      notes: notes ? notes.trim() : "",
    });

    // Save to database
    const savedChild = await newChild.save();
    await savedChild.populate("class");

    res.status(201).json({
      success: true,
      data: savedChild,
      message: "تم إضافة الطفل بنجاح",
    });
  } catch (error) {
    console.error("❌ Error creating child:", error);
    
    // التحقق من نوع الخطأ لإرسال رسالة مناسبة
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: "خطأ في التحقق من البيانات",
        details: validationErrors.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      error: "حدث خطأ في الخادم أثناء إضافة الطفل",
    });
  }
});

// @route   PUT /api/children/:id
// @desc    Update child information (with permission check)
// @access  Protected
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(50));
    console.log("🔄 PUT /children/:id API CALLED");
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("📝 Child ID:", req.params.id);
    console.log("📝 Update data:", req.body);
    console.log("=".repeat(50));

    const child = await Child.findById(req.params.id).populate("class");

    if (!child) {
      return res.status(404).json({
        success: false,
        error: "Child not found",
      });
    }

    console.log("👶 Found child:", child.name, "in class:", child.class?.name);

    // Simplified permission check: Admin can edit all, others can edit only their class
    const canEdit = req.user.role === "admin" || 
                   (req.user.assignedClass && 
                    child.class._id.toString() === req.user.assignedClass._id.toString());

    if (!canEdit) {
      console.log("❌ Access denied - user class:", req.user.assignedClass?._id, "child class:", child.class._id);
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only edit children in your assigned class.",
      });
    }

    console.log("✅ Permission granted for editing");

    const { name, phone, parentName, classId, notes, stage, grade } = req.body;

    // Handle class change
    if (classId && classId !== child.class._id.toString()) {
      const newClass = await Class.findById(classId);
      if (!newClass) {
        return res.status(404).json({
          success: false,
          error: "Class not found",
        });
      }

      // Check if user has permission to move child to new class
      const canMoveToNewClass = req.user.role === "admin" || 
                               (req.user.assignedClass && 
                                req.user.assignedClass._id.toString() === classId);

      if (!canMoveToNewClass) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You can only move children to your assigned class.",
        });
      }

      console.log("✅ Permission granted for class change to:", newClass.name);
    }

    // Update child fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (parentName !== undefined) updateData.parentName = parentName;
    if (classId !== undefined) updateData.class = classId;
    if (notes !== undefined) updateData.notes = notes;
    if (stage !== undefined) updateData.stage = stage;
    if (grade !== undefined) updateData.grade = grade;

    console.log("📝 Updating with data:", updateData);

    const updatedChild = await Child.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("class");

    console.log("✅ Child updated successfully:", updatedChild.name);

    res.json({
      success: true,
      data: updatedChild,
      message: "Child updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating child:", error);
    
    // التحقق من نوع الخطأ لإرسال رسالة مناسبة
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: "خطأ في التحقق من البيانات",
        details: validationErrors.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      error: "حدث خطأ في الخادم أثناء تحديث بيانات الطفل",
    });
  }
});

// @route   DELETE /api/children/:id
// @desc    Delete child (with permission check)
// @access  Protected
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const child = await Child.findById(req.params.id).populate("class");

    if (!child) {
      return res.status(404).json({
        success: false,
        error: "Child not found",
      });
    }

    // Check if user has permission to delete this child
    if (req.user.role !== "admin") {
      if (
        !req.user.assignedClass ||
        child.class._id.toString() !== req.user.assignedClass._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          error:
            "Access denied. You can only delete children in your assigned class.",
        });
      }
    }

    await Child.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Child deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Helper function to get Friday dates going back N weeks
const getFridayDatesBack = (weeksBack) => {
  const fridays = [];
  
  // Get the current date
  const now = new Date();
  
  // Find the most recent Friday
  let daysToSubtract = (now.getDay() - 5 + 7) % 7;
  let mostRecentFriday = subDays(now, daysToSubtract);

  // Generate Friday dates for the past N weeks
  for (let i = 0; i < weeksBack; i++) {
    const friday = subDays(mostRecentFriday, i * 7);
    fridays.push(friday.toISOString().split('T')[0]);
  }
  
  return fridays;
};

// @route   GET /api/children/statistics/by-class
// @desc    Get children statistics grouped by class for service leader (optimized)
// @access  Protected (Service Leader or Admin)
router.get("/statistics/by-class", authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    console.log("🔍 Children by class statistics API called by:", req.user.name, req.user.role);
    
    // Get all classes with their children in one query
    const classes = await Class.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'children',
          localField: '_id',
          foreignField: 'class',
          as: 'children',
          pipeline: [
            { $match: { isActive: true } },
            { $project: { name: 1, phone: 1, parentName: 1 } }
          ]
        }
      },
      { $sort: { stage: 1, order: 1, name: 1 } }
    ]);
    
    console.log(`📊 Found ${classes.length} classes, processing...`);
    
    const classStats = [];
    
    // Get Friday dates for consecutive absence check
    const fridayDates = getFridayDatesBack(4);
    console.log("📅 Checking Friday dates:", fridayDates);
    
    for (const classItem of classes) {
      if (classItem.children.length === 0) {
        classStats.push({
          class: {
            _id: classItem._id,
            name: classItem.name,
            stage: classItem.stage,
            grade: classItem.grade
          },
          totalChildren: 0,
          children: [],
          message: "لا يوجد أطفال في هذا الفصل"
        });
        continue;
      }
      
      console.log(`📊 Processing class: ${classItem.name} with ${classItem.children.length} children`);
      
      // Get all children IDs for this class
      const childrenIds = classItem.children.map(child => child._id);
      
      // Get attendance statistics for all children in this class at once
      const attendanceStats = await Attendance.aggregate([
        {
          $match: {
            person: { $in: childrenIds },
            personModel: "Child",
            type: "child"
          }
        },
        {
          $group: {
            _id: {
              person: "$person",
              status: "$status"
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: "$_id.person",
            stats: {
              $push: {
                status: "$_id.status",
                count: "$count"
              }
            },
            totalRecords: { $sum: "$count" }
          }
        }
      ]);
      
      // Get recent attendance for consecutive absence check
      const recentAttendance = await Attendance.find({
        person: { $in: childrenIds },
        personModel: "Child",
        type: "child",
        date: { $in: fridayDates }
      }, { person: 1, date: 1, status: 1 });
      
      // Create attendance map
      const attendanceMap = {};
      recentAttendance.forEach(record => {
        const personId = record.person.toString();
        if (!attendanceMap[personId]) {
          attendanceMap[personId] = {};
        }
        attendanceMap[personId][record.date] = record.status;
      });
      
      // Create stats map
      const statsMap = {};
      attendanceStats.forEach(stat => {
        const personId = stat._id.toString();
        statsMap[personId] = {
          totalAttendance: stat.totalRecords,
          presentCount: 0,
          absentCount: 0
        };
        
        stat.stats.forEach(s => {
          if (s.status === "present") {
            statsMap[personId].presentCount = s.count;
          } else if (s.status === "absent") {
            statsMap[personId].absentCount = s.count;
          }
        });
      });
      
      const childrenWithStats = classItem.children.map(child => {
        const childId = child._id.toString();
        const stats = statsMap[childId] || { totalAttendance: 0, presentCount: 0, absentCount: 0 };
        const childAttendance = attendanceMap[childId] || {};
        
        // Calculate attendance rate
        const attendanceRate = stats.totalAttendance > 0 ? 
          ((stats.presentCount / stats.totalAttendance) * 100).toFixed(1) : 0;
        
        // Calculate consecutive absences
        let consecutiveAbsences = 0;
        for (const fridayDate of fridayDates) {
          const status = childAttendance[fridayDate];
          if (status === "present") {
            break;
          } else if (status === "absent" || !status) {
            consecutiveAbsences++;
          }
        }
        
        return {
          _id: child._id,
          name: child.name,
          phone: child.phone,
          parentName: child.parentName,
          totalAttendance: stats.totalAttendance,
          presentCount: stats.presentCount,
          absentCount: stats.absentCount,
          attendanceRate: parseFloat(attendanceRate),
          consecutiveAbsences,
          needsFollowUp: consecutiveAbsences >= 3
        };
      });
      
      classStats.push({
        class: {
          _id: classItem._id,
          name: classItem.name,
          stage: classItem.stage,
          grade: classItem.grade
        },
        totalChildren: classItem.children.length,
        children: childrenWithStats,
        childrenNeedingFollowUp: childrenWithStats.filter(c => c.needsFollowUp).length
      });
      
      console.log(`✅ Processed class: ${classItem.name}`);
    }
    
    console.log(`📊 Completed statistics for ${classStats.length} classes`);
    
    res.json({
      success: true,
      data: classStats,
      message: "إحصائيات الأطفال مقسمة حسب الفصول",
      totalClasses: classStats.length,
      totalChildrenChecked: classStats.reduce((sum, cls) => sum + cls.totalChildren, 0)
    });
  } catch (error) {
    console.error("❌ Error in children by class statistics:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/children/statistics/by-class/simple
// @desc    Get simplified children statistics by class (faster version)
// @access  Protected (Service Leader or Admin)
router.get("/statistics/by-class/simple", authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    console.log("🔍 Simple children by class statistics API called");
    
    // Get all classes with children count
    const classStats = await Class.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'children',
          localField: '_id',
          foreignField: 'class',
          as: 'children',
          pipeline: [
            { $match: { isActive: true } },
            { $project: { name: 1, phone: 1 } }
          ]
        }
      },
      {
        $project: {
          name: 1,
          stage: 1,
          grade: 1,
          children: 1,
          totalChildren: { $size: "$children" }
        }
      },
      { $sort: { stage: 1, order: 1, name: 1 } }
    ]);
    
    console.log(`📊 Found ${classStats.length} classes`);
    
    res.json({
      success: true,
      data: classStats.map(cls => ({
        class: {
          _id: cls._id,
          name: cls.name,
          stage: cls.stage,
          grade: cls.grade
        },
        totalChildren: cls.totalChildren,
        children: cls.children.map(child => ({
          _id: child._id,
          name: child.name,
          phone: child.phone,
          // Simplified stats for faster loading
          totalAttendance: 0,
          presentCount: 0,
          absentCount: 0,
          attendanceRate: 0,
          consecutiveAbsences: 0,
          needsFollowUp: false
        })),
        childrenNeedingFollowUp: 0
      })),
      message: "إحصائيات مبسطة للأطفال حسب الفصول",
      totalClasses: classStats.length,
      totalChildrenChecked: classStats.reduce((sum, cls) => sum + cls.totalChildren, 0)
    });
  } catch (error) {
    console.error("❌ Error in simple children statistics:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @route   GET /api/children/statistics/individual/:id
// @desc    Get detailed statistics for a single child
// @access  Protected (Service Leader or Admin)
router.get("/statistics/individual/:id", authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const childId = req.params.id;
    console.log("🔍 Individual child statistics API called for:", childId);
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid child ID format",
      });
    }
    
    // Find the child
    const child = await Child.findById(childId).populate('class');
    if (!child) {
      return res.status(404).json({
        success: false,
        error: "Child not found",
      });
    }
    
    console.log(`👶 Found child: ${child.name}, ID: ${child._id}, Class: ${child.class?.name}`);
    
    // Let's also check what attendance records exist in general
    const totalAttendanceCount = await Attendance.countDocuments();
    const childAttendanceCount = await Attendance.countDocuments({ type: 'child' });
    console.log(`📊 Database info - Total attendance records: ${totalAttendanceCount}, Child attendance records: ${childAttendanceCount}`);
    
    // Get all attendance records for this child - try multiple query methods
    console.log(`🔍 Searching for attendance records for child ID: ${childId}`);
    
    // Use the same query method as statistics-fresh.js which works
    let attendanceRecords = await Attendance.find({
      person: childId,
      type: "child",
    }).sort({ date: -1 });
    
    console.log(`📊 Found ${attendanceRecords.length} attendance records using working query method`);
    console.log(`📊 First few records:`, attendanceRecords.slice(0, 3).map(r => ({ 
      date: r.date, 
      status: r.status, 
      person: r.person,
      type: r.type,
      personModel: r.personModel 
    })));
    
    // Calculate basic statistics
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === "present").length;
    const absentCount = attendanceRecords.filter(r => r.status === "absent").length;
    const lateCount = attendanceRecords.filter(r => r.status === "late").length;
    const attendanceRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;
    
    console.log(`📊 Statistics: total=${totalRecords}, present=${presentCount}, absent=${absentCount}, late=${lateCount}, rate=${attendanceRate}%`);
    
    // Calculate consecutive attendance/absence streaks
    let currentStreak = 0;
    let maxPresentStreak = 0;
    let maxAbsentStreak = 0;
    let currentStreakType = null;
    
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
    
    console.log(`📊 Recent activity created with ${recentActivity.length} records`);
    console.log(`📊 Recent activity sample:`, recentActivity.slice(0, 2));
    
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
      child: {
        _id: child._id,
        name: child.name,
        phone: child.phone,
        parentName: child.parentName,
        class: child.class,
        createdAt: child.createdAt
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
    
    console.log(`📊 Individual statistics compiled for child: ${child.name}`);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error in individual child statistics:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;
