const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Child = require("../models/Child");
const Class = require("../models/Class");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/auth");

// Simple test endpoint
router.get("/test", (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({
    success: true,
    message: "Advanced statistics working!",
    timestamp: new Date().toISOString()
  });
});

// Class comparison endpoint  
router.get("/class-comparison", authMiddleware, async (req, res) => {
  console.log('🔍 Class-comparison API called');
  console.log('📊 Query params:', req.query);
  console.log('👤 User role:', req.user.role);
  
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const userRole = req.user.role;

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'serviceLeader') {
      console.log('❌ Access denied for role:', userRole);
      return res.status(403).json({
        success: false,
        error: "غير مسموح - أمين الخدمة أو الأدمن فقط"
      });
    }

    console.log('✅ Access granted for role:', userRole);

    // Date range calculation
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

    const startDateStr = startDateObj.toISOString().split('T')[0];
    const endDateStr = endDateObj.toISOString().split('T')[0];
    
    console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

    // Get all classes
    const classes = await Class.find({});
    console.log(`🏫 Found ${classes.length} classes`);
    
    const classComparisons = [];

    for (const classObj of classes) {
      // Count children in class
      const totalChildren = await Child.countDocuments({ classId: classObj._id });
      
      // Get attendance records for class in date range
      const attendanceRecords = await Attendance.find({
        class: classObj._id,
        type: 'child',
        date: { $gte: startDateStr, $lte: endDateStr }
      });

      // Calculate statistics
      const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
      const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
      const totalRecords = presentCount + absentCount;
      const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
      
      // Count unique sessions
      const uniqueDates = [...new Set(attendanceRecords.map(r => r.date))];
      const totalSessions = uniqueDates.length;
      const avgAttendancePerSession = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) / 100 : 0;

      classComparisons.push({
        classId: classObj._id,
        className: classObj.name,
        category: classObj.category || 'غير محدد',
        totalChildren,
        totalSessions,
        presentCount,
        absentCount,
        attendanceRate,
        avgAttendancePerSession
      });
    }

    // Sort by attendance rate
    classComparisons.sort((a, b) => b.attendanceRate - a.attendanceRate);
    
    console.log(`📊 Generated ${classComparisons.length} class comparisons`);
    classComparisons.slice(0, 3).forEach(cls => {
      console.log(`  - ${cls.className}: ${cls.attendanceRate}% (${cls.presentCount}/${cls.presentCount + cls.absentCount})`);
    });

    const response = {
      success: true,
      data: {
        classComparisons,
        period,
        startDate: startDateStr,
        endDate: endDateStr,
        totalClasses: classes.length
      }
    };
    
    console.log('✅ Sending response with', response.data.classComparisons.length, 'comparisons');
    res.json(response);

  } catch (error) {
    console.error("❌ Error fetching class comparison:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع مقارنة الفصول"
    });
  }
});

module.exports = router;
