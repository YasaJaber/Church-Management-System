const express = require("express");
const mongoose = require("mongoose");
const ServantAttendance = require("../models/ServantAttendance");
const Attendance = require("../models/Attendance"); // إضافة الموديل الصحيح
const User = require("../models/User");
const { authMiddleware, adminOrServiceLeader } = require("../middleware/auth");
const { zonedTimeToUtc, utcToZonedTime, format } = require('date-fns-tz');

const router = express.Router();

// Helper function to get date string (YYYY-MM-DD format)
const getDateString = (date = new Date()) => {
  return date.toISOString().split("T")[0];
};

// Helper function to get Cairo date string
const getCairoDateString = (date = new Date()) => {
  const cairoDate = utcToZonedTime(date, 'Africa/Cairo');
  return format(cairoDate, 'yyyy-MM-dd');
};

// Get attendance records for a specific date
router.get('/date/:date', authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const { date } = req.params;
    
    console.log(`Getting servant attendance for date: ${date}`);

    // التحقق من صحة التاريخ
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD'
      });
    }

    const attendanceRecords = await ServantAttendance.find({ date })
      .populate('servantId', 'name phone role')
      .populate('markedBy', 'name')
      .sort({ createdAt: -1 });

    console.log(`Found ${attendanceRecords.length} attendance records for date ${date}`);

    res.json({
      success: true,
      data: attendanceRecords
    });

  } catch (error) {
    console.error('Error getting servant attendance by date:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في استرجاع بيانات الحضور'
    });
  }
});

// Delete attendance record by servantId and date
router.delete('/remove', authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const { servantId, date } = req.body;

    console.log('Deleting servant attendance by servantId and date:', { servantId, date });

    // التحقق من البيانات المطلوبة
    if (!servantId || !date) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة: servantId, date'
      });
    }

    // التحقق من صحة التاريخ
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD'
      });
    }

    // حذف من جدول Attendance (الجدول المستخدم فعلياً)
    const attendanceRecord = await Attendance.findOneAndDelete({ 
      person: servantId, 
      date: date,
      type: 'servant' 
    });

    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'سجل الحضور غير موجود لهذا الخادم في التاريخ المحدد'
      });
    }

    console.log('Servant attendance deleted successfully from Attendance table:', attendanceRecord._id);

    res.json({
      success: true,
      message: 'تم حذف سجل الحضور بنجاح'
    });

  } catch (error) {
    console.error('Error deleting servant attendance by servantId and date:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في حذف سجل الحضور'
    });
  }
});

// Create new attendance record
router.post('/', authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const { servantId, date, status, notes } = req.body;

    console.log('Creating servant attendance:', { servantId, date, status });
    console.log('req.user:', req.user);
    console.log('req.user.userId:', req.user.userId);
    console.log('req.user._id:', req.user._id);

    // التحقق من البيانات المطلوبة
    if (!servantId || !date || !status) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة: servantId, date, status'
      });
    }

    // التحقق من صحة التاريخ
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD'
      });
    }

    // التحقق من صحة الحالة
    const validStatuses = ['present', 'absent', 'excused'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'حالة الحضور غير صحيحة'
      });
    }

    // التحقق من وجود الخادم
    const servant = await User.findById(servantId);
    if (!servant) {
      return res.status(404).json({
        success: false,
        error: 'الخادم غير موجود'
      });
    }

    // التحقق من وجود سجل حضور موجود لنفس التاريخ
    const existingRecord = await ServantAttendance.findOne({ servantId, date });
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        error: 'يوجد سجل حضور لهذا الخادم في نفس التاريخ'
      });
    }

    // إنشاء سجل الحضور
    const attendanceRecord = new ServantAttendance({
      servantId,
      date,
      status,
      notes,
      markedBy: req.user.userId || req.user._id
    });

    await attendanceRecord.save();

    // إضافة معلومات الخادم للاستجابة
    await attendanceRecord.populate('servantId', 'name phone role');
    await attendanceRecord.populate('markedBy', 'name');

    console.log('Servant attendance created successfully:', attendanceRecord._id);

    res.status(201).json({
      success: true,
      data: attendanceRecord
    });

  } catch (error) {
    console.error('Error creating servant attendance:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إنشاء سجل الحضور'
    });
  }
});

// Update attendance record
router.put('/:id', authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    console.log('Updating servant attendance:', id, { status, notes });

    // التحقق من صحة الحالة إذا تم توفيرها
    if (status) {
      const validStatuses = ['present', 'absent', 'excused'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'حالة الحضور غير صحيحة'
        });
      }
    }

    const attendanceRecord = await ServantAttendance.findByIdAndUpdate(
      id,
      { 
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        markedBy: req.user.userId || req.user._id,
        markedAt: new Date()
      },
      { new: true }
    ).populate('servantId', 'name phone role')
     .populate('markedBy', 'name');

    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'سجل الحضور غير موجود'
      });
    }

    console.log('Servant attendance updated successfully:', attendanceRecord._id);

    res.json({
      success: true,
      data: attendanceRecord
    });

  } catch (error) {
    console.error('Error updating servant attendance:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تحديث سجل الحضور'
    });
  }
});

// Delete attendance record
router.delete('/:id', authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Deleting servant attendance:', id);

    const attendanceRecord = await ServantAttendance.findByIdAndDelete(id);

    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'سجل الحضور غير موجود'
      });
    }

    console.log('Servant attendance deleted successfully:', id);

    res.json({
      success: true,
      message: 'تم حذف سجل الحضور بنجاح'
    });

  } catch (error) {
    console.error('Error deleting servant attendance:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في حذف سجل الحضور'
    });
  }
});

// Get attendance statistics for a specific servant
router.get('/statistics/:servantId', authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const { servantId } = req.params;

    console.log('Getting attendance statistics for servant:', servantId);

    // التحقق من وجود الخادم
    const servant = await User.findById(servantId);
    if (!servant) {
      return res.status(404).json({
        success: false,
        error: 'الخادم غير موجود'
      });
    }

    // الحصول على جميع سجلات الحضور للخادم
    const attendanceRecords = await ServantAttendance.find({ servantId })
      .sort({ date: -1 });

    // حساب الإحصائيات
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
    const excusedCount = attendanceRecords.filter(r => r.status === 'excused').length;
    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    // حساب السجل المتتالي الحالي
    let currentStreak = 0;
    let currentStreakType = 'none';
    
    if (attendanceRecords.length > 0) {
      const latestStatus = attendanceRecords[0].status;
      currentStreakType = latestStatus;
      
      for (const record of attendanceRecords) {
        if (record.status === latestStatus) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // حساب أطول سجل حضور وغياب
    let maxPresentStreak = 0;
    let maxAbsentStreak = 0;
    let currentPresentStreak = 0;
    let currentAbsentStreak = 0;

    for (const record of attendanceRecords.reverse()) {
      if (record.status === 'present') {
        currentPresentStreak++;
        currentAbsentStreak = 0;
        maxPresentStreak = Math.max(maxPresentStreak, currentPresentStreak);
      } else if (record.status === 'absent') {
        currentAbsentStreak++;
        currentPresentStreak = 0;
        maxAbsentStreak = Math.max(maxAbsentStreak, currentAbsentStreak);
      } else {
        // excused doesn't break streaks but doesn't count towards them
        currentPresentStreak = 0;
        currentAbsentStreak = 0;
      }
    }

    // النشاط الأخير (آخر 20 سجل)
    const recentActivity = attendanceRecords.slice(0, 20).map(record => {
      const date = new Date(record.date + 'T00:00:00');
      const dayName = date.toLocaleDateString('ar', { weekday: 'long' });
      
      return {
        date: record.date,
        status: record.status,
        dayName,
        notes: record.notes || ''
      };
    });

    // التحليل الشهري
    const monthlyBreakdown = {};
    
    attendanceRecords.forEach(record => {
      const month = record.date.substring(0, 7); // YYYY-MM
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = {
          month,
          present: 0,
          absent: 0,
          excused: 0,
          total: 0
        };
      }
      
      monthlyBreakdown[month][record.status]++;
      monthlyBreakdown[month].total++;
    });

    const monthlyData = Object.values(monthlyBreakdown)
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6) // آخر 6 شهور
      .map(month => {
        const rate = month.total > 0 ? ((month.present / month.total) * 100).toFixed(1) : '0.0';
        const monthName = new Date(month.month + '-01').toLocaleDateString('ar', { 
          year: 'numeric', 
          month: 'long' 
        });
        
        return {
          ...month,
          rate: `${rate}%`,
          monthName
        };
      });

    const statistics = {
      servant: {
        _id: servant._id,
        name: servant.name,
        phone: servant.phone,
        role: servant.role
      },
      summary: {
        totalRecords,
        presentCount,
        absentCount,
        excusedCount,
        attendanceRate: parseFloat(attendanceRate.toFixed(1)),
        currentStreak,
        currentStreakType,
        maxPresentStreak,
        maxAbsentStreak
      },
      dates: {
        presentDates: attendanceRecords.filter(r => r.status === 'present').map(r => r.date),
        absentDates: attendanceRecords.filter(r => r.status === 'absent').map(r => r.date),
        excusedDates: attendanceRecords.filter(r => r.status === 'excused').map(r => r.date)
      },
      recentActivity,
      monthlyBreakdown: monthlyData
    };

    console.log('Attendance statistics calculated for servant:', servantId);

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Error getting servant attendance statistics:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في حساب إحصائيات الحضور'
    });
  }
});

// Mark all servants present for a specific date
router.post('/mark-all-present', authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const { date } = req.body;

    console.log('Marking all servants present for date:', date);

    // التحقق من صحة التاريخ
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD'
      });
    }

    // الحصول على جميع الخدام
    const servants = await User.find({ 
      role: { $in: ['servant', 'classTeacher', 'serviceLeader'] },
      isActive: { $ne: false }
    });

    if (servants.length === 0) {
      return res.json({
        success: true,
        message: 'لا يوجد خدام لتسجيل حضورهم',
        data: []
      });
    }

    const attendanceRecords = [];
    
    for (const servant of servants) {
      // التحقق من وجود سجل حضور موجود
      const existingRecord = await ServantAttendance.findOne({ 
        servantId: servant._id, 
        date 
      });

      if (!existingRecord) {
        const record = new ServantAttendance({
          servantId: servant._id,
          date,
          status: 'present',
          notes: 'تم تسجيل الحضور بشكل جماعي',
          markedBy: req.user.userId || req.user._id
        });

        await record.save();
        await record.populate('servantId', 'name phone role');
        attendanceRecords.push(record);
      }
    }

    console.log(`Marked ${attendanceRecords.length} servants as present for date ${date}`);

    res.json({
      success: true,
      message: `تم تسجيل حضور ${attendanceRecords.length} خادم`,
      data: attendanceRecords
    });

  } catch (error) {
    console.error('Error marking all servants present:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تسجيل الحضور الجماعي'
    });
  }
});

// Get attendance summary for all servants (today)
router.get('/summary', authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const date = getCairoDateString();

    console.log('Getting attendance summary for date:', date);

    // Get all attendance records for the date
    const attendanceRecords = await ServantAttendance.find({ date })
      .populate('servantId', 'name');

    // Get all servants
    const allServants = await User.find({ role: 'servant' }).select('name');

    // Create summary
    const summary = {
      date,
      totalServants: allServants.length,
      presentCount: 0,
      absentCount: 0,
      excusedCount: 0,
      servants: []
    };

    // Create a map of attendance records
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      attendanceMap.set(record.servantId._id.toString(), record);
    });

    // Process all servants
    allServants.forEach(servant => {
      const attendance = attendanceMap.get(servant._id.toString());
      const status = attendance ? attendance.status : 'absent';
      
      summary.servants.push({
        servantId: servant._id,
        name: servant.name,
        status,
        notes: attendance ? attendance.notes : ''
      });

      // Count by status
      if (status === 'present') summary.presentCount++;
      else if (status === 'excused') summary.excusedCount++;
      else summary.absentCount++;
    });

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error getting attendance summary:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب ملخص الحضور'
    });
  }
});

// Get attendance summary for all servants
router.get('/summary/:date', authMiddleware, adminOrServiceLeader, async (req, res) => {
  try {
    const date = req.params.date;

    console.log('Getting attendance summary for date:', date);

    // التحقق من صحة التاريخ
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD'
      });
    }

    // الحصول على جميع الخدام
    const servants = await User.find({ 
      role: { $in: ['servant', 'classTeacher', 'serviceLeader'] },
      isActive: { $ne: false }
    }).select('name phone role');

    // الحصول على سجلات الحضور لهذا التاريخ
    const attendanceRecords = await ServantAttendance.find({ date });

    // إنشاء خريطة للحضور
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.servantId.toString()] = record;
    });

    // دمج البيانات
    const summary = servants.map(servant => {
      const attendance = attendanceMap[servant._id.toString()];
      return {
        servant: {
          _id: servant._id,
          name: servant.name,
          phone: servant.phone,
          role: servant.role
        },
        attendance: attendance ? {
          status: attendance.status,
          notes: attendance.notes,
          markedAt: attendance.markedAt
        } : null
      };
    });

    // حساب الإحصائيات
    const stats = {
      totalServants: servants.length,
      presentCount: attendanceRecords.filter(r => r.status === 'present').length,
      absentCount: attendanceRecords.filter(r => r.status === 'absent').length,
      excusedCount: attendanceRecords.filter(r => r.status === 'excused').length,
      notRecordedCount: servants.length - attendanceRecords.length
    };

    console.log('Attendance summary calculated for date:', date);

    res.json({
      success: true,
      data: {
        date,
        statistics: stats,
        servants: summary
      }
    });

  } catch (error) {
    console.error('Error getting attendance summary:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في استرجاع ملخص الحضور'
    });
  }
});

module.exports = router;
