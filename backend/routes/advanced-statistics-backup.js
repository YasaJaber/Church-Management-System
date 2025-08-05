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
    const { classId, period = 'month', startDate, endDate } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let filter = {};
    let classFilter = {};

    // إذا كان المستخدم مدرس فصل أو خادم، يجب أن يرى فصله فقط
    if ((userRole === 'classTeacher' || userRole === 'servant') && req.user.assignedClass) {
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
        case 'week':
          startDateObj.setDate(startDateObj.getDate() - 7);
          break;
        case 'month':
          startDateObj.setMonth(startDateObj.getMonth() - 1);
          break;
        case 'quarter':
          startDateObj.setMonth(startDateObj.getMonth() - 3);
          break;
        case 'year':
          startDateObj.setFullYear(startDateObj.getFullYear() - 1);
          break;
        default:
          startDateObj.setMonth(startDateObj.getMonth() - 1);
      }
    }

    filter.date = {
      $gte: startDateObj,
      $lte: endDateObj
    };

    // الحصول على الفصول
    const classes = await Class.find(classFilter);
    const classIds = classes.map(c => c._id);

    if (classIds.length > 0) {
      filter.classId = { $in: classIds };
    }

    // الحصول على بيانات الحضور
    const attendanceRecords = await Attendance.find(filter)
      .populate('childId', 'name')
      .populate('classId', 'name category')
      .sort({ date: 1 });

    // تجميع البيانات حسب التاريخ
    const dateGroups = {};
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = {
          date: dateKey,
          present: 0,
          absent: 0,
          total: 0,
          classes: {}
        };
      }

      const classId = record.classId._id.toString();
      if (!dateGroups[dateKey].classes[classId]) {
        dateGroups[dateKey].classes[classId] = {
          className: record.classId.name,
          category: record.classId.category,
          present: 0,
          absent: 0,
          total: 0
        };
      }

      if (record.status === 'present') {
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
    const trendsData = Object.values(dateGroups).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json({
      success: true,
      data: {
        trends: trendsData,
        period: period,
        startDate: startDateObj,
        endDate: endDateObj,
        totalRecords: attendanceRecords.length
      }
    });

  } catch (error) {
    console.error("Error fetching attendance trends:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع بيانات الاتجاهات"
    });
  }
});

// @route   GET /api/advanced-statistics/class-comparison
// @desc    Get comparative statistics between classes
// @access  Protected (Admin/Service Leader only)
router.get("/class-comparison", authMiddleware, async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const userRole = req.user.role;

    // التحقق من الصلاحيات
    if (userRole !== 'admin' && userRole !== 'serviceLeader') {
      return res.status(403).json({
        success: false,
        error: "غير مسموح - أمين الخدمة أو الأدمن فقط"
      });
    }

    // تحديد الفترة الزمنية
    const endDateObj = endDate ? new Date(endDate) : new Date();
    let startDateObj = startDate ? new Date(startDate) : new Date(endDateObj);
    
    if (!startDate) {
      switch (period) {
        case 'week':
          startDateObj.setDate(startDateObj.getDate() - 7);
          break;
        case 'month':
          startDateObj.setMonth(startDateObj.getMonth() - 1);
          break;
        case 'quarter':
          startDateObj.setMonth(startDateObj.getMonth() - 3);
          break;
        default:
          startDateObj.setMonth(startDateObj.getMonth() - 1);
      }
    }

    // الحصول على جميع الفصول
    const classes = await Class.find({});
    
    // إحصائيات مقارنة بين الفصول
    const classComparisons = [];

    for (const classObj of classes) {
      // عدد الأطفال الكلي في الفصل
      const totalChildren = await Child.countDocuments({ classId: classObj._id });

      // بيانات الحضور في الفترة المحددة
      const attendanceRecords = await Attendance.find({
        classId: classObj._id,
        date: { $gte: startDateObj, $lte: endDateObj }
      });

      // حساب الإحصائيات
      const totalSessions = await Attendance.distinct('date', {
        classId: classObj._id,
        date: { $gte: startDateObj, $lte: endDateObj }
      }).length;

      const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
      const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
      const totalRecords = presentCount + absentCount;

      const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;
      const avgAttendancePerSession = totalSessions > 0 ? presentCount / totalSessions : 0;

      classComparisons.push({
        classId: classObj._id,
        className: classObj.name,
        category: classObj.category,
        totalChildren,
        totalSessions,
        presentCount,
        absentCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        avgAttendancePerSession: Math.round(avgAttendancePerSession * 100) / 100
      });
    }

    // ترتيب حسب معدل الحضور
    classComparisons.sort((a, b) => b.attendanceRate - a.attendanceRate);

    res.json({
      success: true,
      data: {
        classComparisons,
        period,
        startDate: startDateObj,
        endDate: endDateObj,
        totalClasses: classes.length
      }
    });

  } catch (error) {
    console.error("Error fetching class comparison:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع مقارنة الفصول"
    });
  }
});

// @route   GET /api/advanced-statistics/attendance-frequency
// @desc    Get attendance frequency patterns (how often attendance is taken)
// @access  Protected
router.get("/attendance-frequency", authMiddleware, async (req, res) => {
  try {
    const { classId, period = 'month' } = req.query;
    const userRole = req.user.role;

    let classFilter = {};

    // إذا كان المستخدم مدرس فصل أو خادم، يجب أن يرى فصله فقط
    if ((userRole === 'classTeacher' || userRole === 'servant') && req.user.assignedClass) {
      classFilter._id = req.user.assignedClass;
    } else if (classId) {
      classFilter._id = classId;
    }

    // تحديد الفترة الزمنية
    const endDate = new Date();
    const startDate = new Date(endDate);
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // الحصول على الفصول
    const classes = await Class.find(classFilter);
    const classIds = classes.map(c => c._id);

    // تجميع البيانات حسب التاريخ والفصل
    const frequencyData = await Attendance.aggregate([
      {
        $match: {
          classId: { $in: classIds },
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            classId: "$classId"
          },
          attendanceCount: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: "classes",
          localField: "_id.classId",
          foreignField: "_id",
          as: "classInfo"
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // تحليل تكرار أخذ الحضور
    const dateFrequency = {};
    frequencyData.forEach(record => {
      const date = record._id.date;
      if (!dateFrequency[date]) {
        dateFrequency[date] = {
          date,
          classesWithAttendance: 0,
          totalAttendanceRecords: 0,
          classes: []
        };
      }
      
      dateFrequency[date].classesWithAttendance++;
      dateFrequency[date].totalAttendanceRecords += record.attendanceCount;
      dateFrequency[date].classes.push({
        classId: record._id.classId,
        className: record.classInfo[0]?.name || 'Unknown',
        attendanceCount: record.attendanceCount,
        presentCount: record.presentCount,
        absentCount: record.absentCount
      });
    });

    // احصائيات عامة
    const totalDays = Object.keys(dateFrequency).length;
    const avgClassesPerDay = totalDays > 0 ? 
      Object.values(dateFrequency).reduce((sum, day) => sum + day.classesWithAttendance, 0) / totalDays : 0;

    res.json({
      success: true,
      data: {
        frequencyByDate: Object.values(dateFrequency),
        summary: {
          totalDays,
          avgClassesPerDay: Math.round(avgClassesPerDay * 100) / 100,
          totalClasses: classes.length,
          period
        }
      }
    });

  } catch (error) {
    console.error("Error fetching attendance frequency:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع تكرار الحضور"
    });
  }
});

// @route   GET /api/advanced-statistics/individual-class/:classId
// @desc    Get detailed statistics for individual class
// @access  Protected
router.get("/individual-class/:classId", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;
    const { period = 'month', startDate, endDate } = req.query;
    const userRole = req.user.role;

    // التحقق من الصلاحيات
    if ((userRole === 'classTeacher' || userRole === 'servant')) {
      if (!req.user.assignedClass || req.user.assignedClass.toString() !== classId) {
        return res.status(403).json({
          success: false,
          error: "غير مسموح - يمكنك رؤية فصلك فقط"
        });
      }
    }

    // الحصول على معلومات الفصل
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        error: "الفصل غير موجود"
      });
    }

    // تحديد الفترة الزمنية
    const endDateObj = endDate ? new Date(endDate) : new Date();
    let startDateObj = startDate ? new Date(startDate) : new Date(endDateObj);
    
    if (!startDate) {
      switch (period) {
        case 'week':
          startDateObj.setDate(startDateObj.getDate() - 7);
          break;
        case 'month':
          startDateObj.setMonth(startDateObj.getMonth() - 1);
          break;
        case 'quarter':
          startDateObj.setMonth(startDateObj.getMonth() - 3);
          break;
        default:
          startDateObj.setMonth(startDateObj.getMonth() - 1);
      }
    }

    // الحصول على الأطفال في الفصل
    const children = await Child.find({ classId }).select('name');
    const totalChildren = children.length;

    // بيانات الحضور للفصل
    const attendanceRecords = await Attendance.find({
      classId,
      date: { $gte: startDateObj, $lte: endDateObj }
    }).populate('childId', 'name').sort({ date: 1 });

    // تحليل البيانات حسب الطفل
    const childrenAnalysis = {};
    children.forEach(child => {
      childrenAnalysis[child._id] = {
        childId: child._id,
        name: child.name,
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        attendanceRate: 0,
        consecutiveAbsent: 0,
        lastAttendance: null
      };
    });

    // تحليل السجلات
    const sessionDates = [...new Set(attendanceRecords.map(r => r.date.toISOString().split('T')[0]))];
    
    attendanceRecords.forEach(record => {
      const childId = record.childId._id.toString();
      if (childrenAnalysis[childId]) {
        if (record.status === 'present') {
          childrenAnalysis[childId].presentCount++;
          childrenAnalysis[childId].lastAttendance = record.date;
        } else {
          childrenAnalysis[childId].absentCount++;
        }
      }
    });

    // حساب معدلات الحضور والغياب المتتالي
    Object.values(childrenAnalysis).forEach(child => {
      const totalRecords = child.presentCount + child.absentCount;
      child.attendanceRate = totalRecords > 0 ? (child.presentCount / totalRecords) * 100 : 0;
      child.totalSessions = sessionDates.length;
      
      // حساب الغياب المتتالي
      const recentRecords = attendanceRecords
        .filter(r => r.childId._id.toString() === child.childId.toString())
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
      
      let consecutiveCount = 0;
      for (const record of recentRecords) {
        if (record.status === 'absent') {
          consecutiveCount++;
        } else {
          break;
        }
      }
      child.consecutiveAbsent = consecutiveCount;
    });

    // إحصائيات عامة للفصل
    const presentTotal = attendanceRecords.filter(r => r.status === 'present').length;
    const absentTotal = attendanceRecords.filter(r => r.status === 'absent').length;
    const totalRecords = presentTotal + absentTotal;
    const classAttendanceRate = totalRecords > 0 ? (presentTotal / totalRecords) * 100 : 0;

    res.json({
      success: true,
      data: {
        classInfo: {
          id: classInfo._id,
          name: classInfo.name,
          category: classInfo.category,
          totalChildren
        },
        period: {
          start: startDateObj,
          end: endDateObj,
          totalSessions: sessionDates.length
        },
        overallStats: {
          totalRecords,
          presentTotal,
          absentTotal,
          attendanceRate: Math.round(classAttendanceRate * 100) / 100,
          avgAttendancePerSession: sessionDates.length > 0 ? presentTotal / sessionDates.length : 0
        },
        childrenAnalysis: Object.values(childrenAnalysis),
        sessionDates
      }
    });

  } catch (error) {
    console.error("Error fetching individual class statistics:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع إحصائيات الفصل"
    });
  }
});

module.exports = router;
