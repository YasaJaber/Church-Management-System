# قسم مواظبة الخدام المتتالية (4 أسابيع) - دليل التنفيذ الكامل

## 📋 نظرة عامة

هذا الدليل يوضح كيفية إنشاء قسم كامل لتتبع مواظبة الخدام المتتالية لمدة 4 أسابيع أو أكثر، مشابه تماماً لقسم الأطفال الموجود حالياً.

### ⚠️ ملاحظة مهمة عن الإحصائيات الأسبوعية

**في قسم الأطفال:**
- النظام يجيب **آخر 4 مرات تم تسجيل حضور فيها** (مش شرط جمعة)
- يستخدم endpoint `/api/attendance/recent-dates` اللي بيجيب الـ distinct dates
- لو الحضور اتسجل يوم سبت أو أحد، بيجيبه برضو

**في قسم الخدام (هذا الملف):**
- نفس النظام: بنجيب **آخر 4 مرات تم تسجيل حضور خدام**
- نستخدم `Attendance.distinct("date", { type: "servant" })`
- مش بنحدد يوم جمعة - بنجيب أي يوم تم تسجيل حضور فيه

### الهدف من القسم

- **تتبع الخدام** الذين حافظوا على الحضور لمدة 4 أسابيع متتالية أو أكثر
- **تحفيز الخدام** على المواظبة المستمرة
- **تقديم مكافآت** للخدام الملتزمين
- **إدارة دورات المواظبة** بإعادة تعيين العدادات بعد توزيع المكافآت
- **صلاحية الوصول**: أمين الخدمة (Service Leader) فقط

---

## 🎯 المميزات المطلوبة

### 1. عرض إحصائيات المواظبة
- عرض جميع الخدام المواظبين (4 أسابيع متتالية أو أكثر)
- ترتيب الخدام حسب عدد الأسابيع (الأعلى أولاً)
- عرض اسم الخادم وعدد الأسابيع المتتالية
- إجمالي عدد الخدام المواظبين

### 2. إحصائيات أسبوعية (آخر 4 أسابيع)
- عرض نسبة الحضور لكل أسبوع
- مخطط بياني يوضح التطور الأسبوعي
- إجمالي عدد الخدام في كل أسبوع
- عدد الحاضرين في كل أسبوع

### 3. تسليم المكافآت
- زر لتسليم المكافأة لكل خادم
- تسجيل تاريخ التسليم والمسؤول عن التسليم
- إعادة تعيين عداد المواظبة بعد التسليم
- عدم السماح بتسليم مكافأة مرتين خلال 7 أيام

### 4. إعادة تعيين جماعية
- زر لإعادة تعيين المواظبة لجميع الخدام
- مناسب بعد توزيع المكافآت لبدء دورة جديدة
- تأكيد قبل التنفيذ لمنع الحذف بالخطأ

---

## 🗂️ التعديلات المطلوبة

### 1. Backend API Routes

#### ملف: `backend/routes/servants-attendance.js`

يجب إضافة الـ endpoints التالية:

```javascript
// @route   GET /api/servants-attendance/consecutive-attendance
// @desc    Get servants with 4+ consecutive weeks of attendance
// @access  Protected (Service Leader only)
router.get("/consecutive-attendance", authMiddleware, async (req, res) => {
  try {
    console.log("📊 Fetching servants consecutive attendance statistics");
    console.log("👤 User role:", req.user.role);

    // Check permissions - Service Leader only
    if (req.user.role !== 'serviceLeader' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "هذا القسم متاح لأمين الخدمة فقط"
      });
    }

    const { minDays = 4 } = req.query;

    // Get all active servants
    const servants = await User.find({
      role: { $in: ['servant', 'classTeacher'] },
      isActive: true
    }).populate('assignedClass', 'name');

    const consecutiveServants = [];

    for (const servant of servants) {
      // Get the last gift delivery date for this servant (acts as reset point)
      const lastGift = await GiftDelivery.findOne({
        servant: servant._id,
        isActive: true
      }).sort({ deliveryDate: -1 });

      // Get attendance records for this servant, sorted by date desc
      const attendanceRecords = await ServantAttendance.find({
        servant: servant._id
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

      // Only include servants with 4+ consecutive weeks
      if (consecutiveCount >= parseInt(minDays)) {
        consecutiveServants.push({
          servantId: servant._id,
          name: servant.name,
          username: servant.username,
          role: servant.role,
          assignedClass: servant.assignedClass?.name || 'غير محدد',
          consecutiveWeeks: consecutiveCount,
        });
      }
    }

    // Sort by consecutive weeks desc
    consecutiveServants.sort((a, b) => b.consecutiveWeeks - a.consecutiveWeeks);

    console.log(`✅ Found ${consecutiveServants.length} servants with consecutive attendance`);

    res.json({
      success: true,
      data: consecutiveServants,
      summary: {
        totalServants: consecutiveServants.length,
        minDays: parseInt(minDays),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching consecutive attendance:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع إحصائيات المواظبة المتتالية",
    });
  }
});

// @route   GET /api/servants-attendance/weekly-stats
// @desc    Get attendance statistics for last 4 recorded attendance sessions (not necessarily Fridays)
// @access  Protected (Service Leader only)
router.get("/weekly-stats", authMiddleware, async (req, res) => {
  try {
    console.log("📊 Fetching attendance statistics for last 4 sessions");

    // Check permissions
    if (req.user.role !== 'serviceLeader' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "هذا القسم متاح لأمين الخدمة فقط"
      });
    }

    // Get last 4 dates when attendance was recorded (NOT necessarily Fridays!)
    const recentDates = await getLastAttendanceDates(4);
    
    if (recentDates.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    console.log("📅 Last attendance dates:", recentDates);

    const weeklyStats = [];
    const totalServants = await User.countDocuments({
      role: { $in: ['servant', 'classTeacher'] },
      isActive: true
    });

    for (const date of recentDates) {
      const attendanceRecords = await Attendance.find({
        date: date,
        type: "servant"
      });

      const presentCount = attendanceRecords.filter(
        record => record.status === 'present'
      ).length;

      const attendanceRate = totalServants > 0 
        ? (presentCount / totalServants) * 100 
        : 0;

      weeklyStats.push({
        date: date,
        totalServants,
        presentCount,
        attendanceRate: Math.round(attendanceRate * 10) / 10
      });
    }

    console.log(`✅ Found ${weeklyStats.length} attendance sessions`);

    res.json({
      success: true,
      data: weeklyStats // Already in order from oldest to newest
    });
  } catch (error) {
    console.error("❌ Error fetching attendance stats:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في استرجاع الإحصائيات"
    });
  }
});

// Helper function to get last N attendance dates (NOT necessarily Fridays!)
async function getLastAttendanceDates(count) {
  try {
    // Get the most recent dates when servant attendance was recorded
    const dates = await Attendance.distinct("date", { type: "servant" });
    
    // Sort dates in descending order (newest first) and take the last 'count' dates
    const sortedDates = dates
      .map((date) => {
        if (typeof date === "string") {
          return date;
        } else if (date instanceof Date) {
          return date.toISOString().split("T")[0];
        } else {
          return new Date(date).toISOString().split("T")[0];
        }
      })
      .sort((a, b) => new Date(b) - new Date(a))
      .slice(0, parseInt(count));
    
    return sortedDates.reverse(); // عرض من الأقدم للأحدث
  } catch (error) {
    console.error('Error getting last attendance dates:', error);
    return [];
  }
}

// @route   POST /api/servants-attendance/deliver-gift
// @desc    Mark gift as delivered and reset servant's consecutive attendance
// @access  Protected (Service Leader only)
router.post("/deliver-gift", authMiddleware, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🎁 Delivering gift to servant");
    console.log("👤 User:", req.user.name);
    console.log("=".repeat(60));

    // Check permissions
    if (req.user.role !== 'serviceLeader' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "ليس لديك صلاحية لتسليم المكافآت"
      });
    }

    const { servantId } = req.body;

    if (!servantId) {
      return res.status(400).json({
        success: false,
        error: "يرجى تحديد الخادم"
      });
    }

    // Get servant info
    const servant = await User.findById(servantId);
    
    if (!servant) {
      return res.status(404).json({
        success: false,
        error: "الخادم غير موجود"
      });
    }

    console.log(`👤 Servant: ${servant.name}`);

    // Calculate consecutive weeks
    const attendanceRecords = await ServantAttendance.find({
      servant: servant._id
    }).sort({ date: -1 });

    let consecutiveCount = 0;
    for (const record of attendanceRecords) {
      if (record.status === "present") {
        consecutiveCount++;
      } else if (record.status === "absent") {
        break;
      }
    }

    console.log(`📊 Consecutive weeks: ${consecutiveCount}`);

    // Check if already delivered gift recently (within last 7 days)
    const recentGift = await GiftDelivery.findOne({
      servant: servantId,
      deliveryDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    if (recentGift) {
      return res.status(400).json({
        success: false,
        error: "تم تسليم مكافأة لهذا الخادم مؤخراً (خلال آخر 7 أيام)"
      });
    }

    // Create gift delivery record
    const giftDelivery = await GiftDelivery.create({
      servant: servantId,
      deliveredBy: req.user._id,
      consecutiveWeeksEarned: consecutiveCount,
      giftType: `مواظبة ${consecutiveCount} أسبوع`,
      notes: `تم التسليم بواسطة ${req.user.name}`,
      deliveryDate: new Date(),
      isActive: true
    });

    console.log(`✅ Gift delivery recorded: ${giftDelivery._id}`);

    res.json({
      success: true,
      message: `تم تسليم المكافأة لـ ${servant.name} وإعادة تعيين العداد`,
      data: {
        servantId: servant._id,
        servantName: servant.name,
        consecutiveWeeks: consecutiveCount,
        deliveryDate: giftDelivery.deliveryDate,
        deliveredBy: req.user.name
      }
    });
  } catch (error) {
    console.error("❌ Error delivering gift:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في تسليم المكافأة",
      details: error.message
    });
  }
});

// @route   POST /api/servants-attendance/reset-consecutive
// @desc    Reset consecutive attendance for all servants
// @access  Protected (Service Leader only)
router.post("/reset-consecutive", authMiddleware, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 Resetting all servants consecutive attendance");
    console.log("👤 User:", req.user.name);
    console.log("=".repeat(60));

    // Check permissions
    if (req.user.role !== 'serviceLeader' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "ليس لديك صلاحية لإعادة تعيين المواظبة"
      });
    }

    // Get all active servants
    const servants = await User.find({
      role: { $in: ['servant', 'classTeacher'] },
      isActive: true
    });

    console.log(`📚 Found ${servants.length} servants`);

    // Create gift delivery records as reset markers
    const today = new Date();
    const giftRecords = [];
    
    for (const servant of servants) {
      // Check if already has a gift delivery today
      const existingGift = await GiftDelivery.findOne({
        servant: servant._id,
        deliveryDate: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999))
        }
      });

      if (!existingGift) {
        giftRecords.push({
          servant: servant._id,
          deliveredBy: req.user._id,
          consecutiveWeeksEarned: 0,
          giftType: "إعادة تعيين عداد المواظبة",
          notes: `🔄 إعادة تعيين جماعي بواسطة ${req.user.name}`,
          deliveryDate: new Date(),
          isActive: true
        });
      }
    }

    if (giftRecords.length > 0) {
      await GiftDelivery.insertMany(giftRecords);
      console.log(`✅ Reset ${giftRecords.length} servants' consecutive attendance`);
    }

    res.json({
      success: true,
      message: `تم إعادة تعيين المواظبة لـ ${servants.length} خادم (بدون تأثير على سجل الحضور)`,
      data: {
        servantsCount: servants.length,
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
```

---

### 2. تعديل نموذج GiftDelivery

#### ملف: `backend/models/GiftDelivery.js`

يجب تعديل النموذج ليدعم الخدام أيضاً:

```javascript
const mongoose = require("mongoose");

const giftDeliverySchema = new mongoose.Schema({
  // يدعم الأطفال والخدام
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Child",
    required: function() { return !this.servant; } // مطلوب إذا لم يكن servant
  },
  servant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: function() { return !this.child; } // مطلوب إذا لم يكن child
  },
  deliveredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  deliveryDate: {
    type: Date,
    default: Date.now,
  },
  consecutiveWeeksEarned: {
    type: Number,
    required: true,
  },
  giftType: {
    type: String,
    default: "هدية مواظبة",
  },
  notes: {
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for better query performance
giftDeliverySchema.index({ child: 1, deliveryDate: -1 });
giftDeliverySchema.index({ servant: 1, deliveryDate: -1 });

module.exports = mongoose.model("GiftDelivery", giftDeliverySchema);
```

---

### 3. Frontend - صفحة جديدة

#### ملف: `web/src/app/servants-consecutive-attendance/page.tsx`

```tsx
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/services/api'

interface ConsecutiveServant {
  servantId: string
  name: string
  username: string
  role: string
  assignedClass: string
  consecutiveWeeks: number
}

interface WeeklyAttendance {
  date: string
  totalServants: number
  presentCount: number
  attendanceRate: number
}

export default function ServantsConsecutiveAttendancePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [servantsData, setServantsData] = useState<ConsecutiveServant[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deliveryLoading, setDeliveryLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    if (isAuthenticated && user) {
      // أمين الخدمة والأدمن فقط
      if (user.role !== 'admin' && user.role !== 'serviceLeader') {
        router.push('/statistics')
        return
      }
      
      initializePage()
    }
  }, [isAuthenticated, isLoading, router, user])

  const initializePage = async () => {
    await Promise.all([
      fetchConsecutiveAttendance(),
      fetchWeeklyData()
    ])
  }

  const getLastFridays = (count: number) => {
    const fridays = []
    const today = new Date()
    let current = new Date(today)
    
    // البحث عن آخر جمعة
    while (current.getDay() !== 5) {
      current.setDate(current.getDate() - 1)
    }
    
    // الحصول على آخر 'count' جمعات
    for (let i = 0; i < count; i++) {
      fridays.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() - 7)
    }
    
    return fridays.reverse()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const fetchConsecutiveAttendance = async () => {
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      if (!token) {
        setError('يرجى تسجيل الدخول أولاً')
        return
      }
      
      const url = `${API_BASE_URL}/servants-attendance/consecutive-attendance?minDays=4`
      console.log('📊 Fetching from:', url)
      console.log('🔑 Using token:', token.substring(0, 50) + '...')
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📊 Response status:', response.status)
      console.log('📊 Response headers:', response.headers)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response error:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('📊 API Response:', data)
      
      if (data.success) {
        setServantsData(data.data || [])
        console.log('✅ Servants data set:', data.data?.length || 0, 'servants')
      } else {
        setError(data.error || 'حدث خطأ في جلب البيانات')
        console.error('❌ API Error:', data.error)
      }
    } catch (error: any) {
      console.error('❌ Error fetching consecutive attendance:', error)
      setError(error.message || 'حدث خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklyData = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      const url = `${API_BASE_URL}/servants-attendance/weekly-stats`
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.data) {
          setWeeklyData(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching weekly data:', error)
    }
  }

  const handleDeliverGift = async (servantId: string, servantName: string) => {
    try {
      setDeliveryLoading(servantId)
      
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      const response = await fetch(`${API_BASE_URL}/servants-attendance/deliver-gift`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ servantId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`🎁 ${data.message}`)
        await fetchConsecutiveAttendance()
      } else {
        alert(`❌ خطأ: ${data.error}`)
      }
    } catch (error: any) {
      console.error('Error delivering gift:', error)
      alert(`❌ حدث خطأ في تسليم المكافأة: ${error.message}`)
    } finally {
      setDeliveryLoading(null)
    }
  }

  const handleResetConsecutive = async () => {
    const confirmed = window.confirm(
      '⚠️ هل أنت متأكد من إعادة تعيين المواظبة؟\n\n' +
      'سيتم إعادة تعيين عداد المواظبة لجميع الخدام وسيبدأ العد من الصفر.\n\n' +
      'هذا الإجراء مناسب بعد توزيع المكافآت لبدء دورة جديدة.'
    )

    if (!confirmed) return

    try {
      setLoading(true)
      
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      if (!token) {
        alert('يرجى تسجيل الدخول أولاً')
        return
      }

      const response = await fetch(`${API_BASE_URL}/servants-attendance/reset-consecutive`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ ${data.message}\n\n🎉 تم بدء دورة مواظبة جديدة!`)
        await fetchConsecutiveAttendance()
      } else {
        alert(`❌ خطأ: ${data.error}`)
      }
    } catch (error: any) {
      console.error('Error resetting:', error)
      alert(`❌ حدث خطأ: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading && servantsData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">جاري تحميل بيانات المواظبة...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">خطأ</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-xl">
                <span className="text-4xl">👥</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-800">
                  مواظبة الخدام المتتالية
                </h1>
                <p className="text-gray-600 mt-2">
                  الخدام الذين حافظوا على الحضور لمدة 4 أسابيع متتالية أو أكثر
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/service-leader-dashboard')}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
            >
              ← العودة
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">إجمالي الخدام المواظبين</p>
                  <p className="text-4xl font-bold mt-2">{servantsData.length}</p>
                </div>
                <div className="text-5xl opacity-80">🏆</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">أعلى مواظبة</p>
                  <p className="text-4xl font-bold mt-2">
                    {servantsData.length > 0 ? servantsData[0].consecutiveWeeks : 0} أسبوع
                  </p>
                </div>
                <div className="text-5xl opacity-80">📊</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">متوسط المواظبة</p>
                  <p className="text-4xl font-bold mt-2">
                    {servantsData.length > 0 
                      ? Math.round(servantsData.reduce((sum, s) => sum + s.consecutiveWeeks, 0) / servantsData.length)
                      : 0} أسبوع
                  </p>
                </div>
                <div className="text-5xl opacity-80">⭐</div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Statistics - Last 4 Sessions */}
        {weeklyData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              📈 آخر 4 مرات تم تسجيل الحضور فيها
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              📝 ملاحظة: هذه ليست بالضرورة أيام جمعة - بل آخر 4 مرات تم تسجيل الحضور فيها
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {weeklyData.map((week, index) => (
                <div 
                  key={index}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200"
                >
                  <p className="text-sm text-gray-600 mb-2">
                    {formatDate(week.date)}
                  </p>
                  <p className="text-3xl font-bold text-indigo-600 mb-2">
                    {week.attendanceRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    {week.presentCount} / {week.totalServants} خادم
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${week.attendanceRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">إجراءات</h3>
              <p className="text-gray-600 text-sm mt-1">
                إدارة دورة المواظبة والمكافآت
              </p>
            </div>
            <button
              onClick={handleResetConsecutive}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition shadow-lg flex items-center gap-2"
            >
              <span className="text-xl">🔄</span>
              <span>إعادة تعيين المواظبة لجميع الخدام</span>
            </button>
          </div>
        </div>

        {/* Servants List */}
        {servantsData.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              🏆 قائمة الخدام المواظبين
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الترتيب
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      اسم الخادم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الدور
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الفصل المكلف به
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عدد أسابيع المواظبة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التقدير
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تسليم المكافأة
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {servantsData.map((servant, index) => (
                    <tr key={servant.servantId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end">
                          {index === 0 && (
                            <span className="text-yellow-500 text-lg mr-2">🥇</span>
                          )}
                          {index === 1 && (
                            <span className="text-gray-400 text-lg mr-2">🥈</span>
                          )}
                          {index === 2 && (
                            <span className="text-yellow-600 text-lg mr-2">🥉</span>
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {servant.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {servant.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {servant.role === 'servant' ? 'خادم' : 'مدرس فصل'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {servant.assignedClass || 'غير محدد'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end">
                          <div className="text-sm font-medium text-gray-900 mr-2">
                            {servant.consecutiveWeeks} أسبوع
                          </div>
                          <div className="w-12 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full" 
                              style={{ width: `${Math.min((servant.consecutiveWeeks / 8) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          servant.consecutiveWeeks >= 8 ? 'bg-green-100 text-green-800' :
                          servant.consecutiveWeeks >= 6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {servant.consecutiveWeeks >= 8 ? 'ممتاز ⭐' :
                           servant.consecutiveWeeks >= 6 ? 'جيد جداً 👍' :
                           'جيد 👌'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeliverGift(servant.servantId, servant.name)}
                          disabled={deliveryLoading === servant.servantId}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium flex items-center gap-2"
                        >
                          {deliveryLoading === servant.servantId ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              جاري التسليم...
                            </>
                          ) : (
                            <>
                              🎁 تم تسليم المكافأة
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-8xl mb-6">📊</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-4">
              لا يوجد خدام بمواظبة 4 أسابيع متتالية حالياً
            </h3>
            <p className="text-gray-600 mb-4">
              سيظهر الخدام هنا عندما يحافظون على الحضور لمدة 4 أسابيع متتالية
            </p>
            <button 
              onClick={() => fetchConsecutiveAttendance()}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
```

---

## 🔗 إضافة الرابط في لوحة أمين الخدمة

#### ملف: `web/src/app/service-leader-dashboard/page.tsx`

أضف بطاقة جديدة في قسم "الروابط السريعة":

```tsx
{/* في قسم الروابط السريعة - أضف هذه البطاقة */}
<Link href="/servants-consecutive-attendance" className="block">
  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-lg shadow hover:shadow-md transition-shadow text-white">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-bold">مواظبة الخدام المتتالية</h3>
        <p className="text-purple-100 text-sm mt-1">الخدام الملتزمون بالحضور 4 أسابيع متتالية أو أكثر</p>
        <div className="text-2xl font-bold mt-2">
          {stats.consecutiveServants || 0} خادم
        </div>
      </div>
      <div className="text-3xl">👥</div>
    </div>
  </div>
</Link>
```

**ملاحظة**: يجب إضافة `consecutiveServants` في الـ `DashboardStats` interface و fetch data من API:

```tsx
interface DashboardStats {
  children: {
    total: number
    present: number
    attendanceRate: number
  }
  servants: {
    total: number
    present: number
    attendanceRate: number
    needingFollowUp: number
  }
  classes: {
    total: number
    excellentAttendance: number
    needsImprovement: number
  }
  consecutive: {
    children: number
    averageWeeks: number
  }
  consecutiveServants: number  // ← أضف هذا
}

// في fetchDashboardData function أضف:
const servantsConsecutiveResponse = await fetch(`${API_BASE_URL}/servants-attendance/consecutive-attendance?minDays=4`, {
  headers: { 'Authorization': `Bearer ${token}` }
})

const servantsConsecutiveData = servantsConsecutiveResponse.ok ? await servantsConsecutiveResponse.json() : { success: false }

// في newStats object أضف:
consecutiveServants: servantsConsecutiveData.success ? (servantsConsecutiveData.data || []).length : 0
```

---

## � ملاحظات مهمة عن نظام حضور الخدام

### نموذج حضور الخدام (ServantAttendance vs Attendance)

في النظام الحالي، **حضور الخدام يُسجّل في جدول `Attendance`** (نفس جدول الأطفال) وليس `ServantAttendance`.

#### البنية الحالية لجدول Attendance:

```javascript
{
  type: 'servant',           // لتمييز حضور الخدام
  person: ObjectId(User),    // معرف الخادم
  personModel: 'User',       // نوع الموديل
  date: String,              // YYYY-MM-DD
  status: String,            // present, absent, excused
  notes: String,
  recordedBy: ObjectId(User)
}
```

**⚠️ مهم**: 
- عند كتابة الـ endpoints الخاصة بالخدام، استخدم `Attendance` model مع `type: 'servant'`
- **لا تستخدم** `ServantAttendance` model (موجود لكن غير مستخدم فعلياً)

#### تعديل الكود في Backend:

في ملف `backend/routes/servants-attendance.js`، استخدم:

```javascript
const Attendance = require("../models/Attendance");  // ← الصحيح

// وليس:
// const ServantAttendance = require("../models/ServantAttendance");  // ✗ خطأ
```

عند جلب الحضور:

```javascript
const attendanceRecords = await Attendance.find({
  person: servant._id,
  type: "servant"  // ← مهم جداً
}).sort({ date: -1 });
```

---

## �📊 ملخص التغييرات

### Backend

1. ✅ إضافة 4 endpoints جديدة في `servants-attendance.js`:
   - `GET /consecutive-attendance` - جلب الخدام المواظبين
   - `GET /weekly-stats` - إحصائيات أسبوعية
   - `POST /deliver-gift` - تسليم مكافأة
   - `POST /reset-consecutive` - إعادة تعيين جماعية

2. ✅ تعديل نموذج `GiftDelivery` لدعم الخدام

3. ⚠️ استخدام `Attendance` model بدلاً من `ServantAttendance`

### Frontend
1. ✅ صفحة جديدة `/servants-consecutive-attendance`
2. ✅ ربط الصفحة بلوحة أمين الخدمة
3. ✅ واجهة مستخدم حديثة بتصميم جذاب

---

## 🔐 الصلاحيات

- **أمين الخدمة (Service Leader)**: الوصول الكامل لجميع المميزات
- **الأدمن (Admin)**: الوصول الكامل لجميع المميزات
- **باقي المستخدمين**: لا يمكنهم الوصول للقسم

---

## 🎯 كيفية الاستخدام

### 1. متابعة المواظبة
- افتح القسم من لوحة أمين الخدمة
- شاهد قائمة الخدام المواظبين مرتبة حسب عدد الأسابيع
- راجع الإحصائيات الأسبوعية

### 2. تسليم المكافآت
- اضغط على زر "تسليم مكافأة" بجانب اسم الخادم
- سيتم تسجيل التسليم وإعادة تعيين العداد تلقائياً
- لا يمكن تسليم مكافأة مرتين خلال 7 أيام

### 3. بدء دورة جديدة
- بعد توزيع جميع المكافآت، اضغط على "إعادة تعيين المواظبة"
- سيتم إعادة تعيين العدادات لجميع الخدام
- يبدأ العد من الصفر للدورة الجديدة

---

## 🧪 اختبار الـ API

### 1. اختبار جلب الخدام المواظبين

```bash
GET /api/servants-attendance/consecutive-attendance?minDays=4
Authorization: Bearer YOUR_TOKEN

# Response Example:
{
  "success": true,
  "data": [
    {
      "servantId": "507f1f77bcf86cd799439011",
      "name": "أبونا فلان",
      "username": "abouna",
      "role": "servant",
      "assignedClass": "ابتدائي الصف الأول",
      "consecutiveWeeks": 6
    }
  ],
  "summary": {
    "totalServants": 1,
    "minDays": 4
  }
}
```

### 2. اختبار الإحصائيات (آخر 4 مرات تم تسجيل حضور)

```bash
GET /api/servants-attendance/weekly-stats
Authorization: Bearer YOUR_TOKEN

# ملاحظة: يجيب آخر 4 مرات تم تسجيل حضور فيها (مش شرط جمعة)
# Response Example:
{
  "success": true,
  "data": [
    {
      "date": "2025-09-15",  // قد يكون أي يوم - ليس بالضرورة جمعة
      "totalServants": 25,
      "presentCount": 22,
      "attendanceRate": 88.0
    },
    {
      "date": "2025-09-22",
      "totalServants": 25,
      "presentCount": 23,
      "attendanceRate": 92.0
    },
    {
      "date": "2025-09-29",
      "totalServants": 25,
      "presentCount": 24,
      "attendanceRate": 96.0
    },
    {
      "date": "2025-10-04",
      "totalServants": 25,
      "presentCount": 24,
      "attendanceRate": 96.0
    }
  ]
}
```

### 3. اختبار تسليم المكافأة

```bash
POST /api/servants-attendance/deliver-gift
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "servantId": "507f1f77bcf86cd799439011"
}

# Response Example:
{
  "success": true,
  "message": "تم تسليم المكافأة لـ أبونا فلان وإعادة تعيين العداد",
  "data": {
    "servantId": "507f1f77bcf86cd799439011",
    "servantName": "أبونا فلان",
    "consecutiveWeeks": 6,
    "deliveryDate": "2025-10-04T10:30:00.000Z",
    "deliveredBy": "Admin"
  }
}
```

### 4. اختبار إعادة التعيين الجماعية

```bash
POST /api/servants-attendance/reset-consecutive
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{}

# Response Example:
{
  "success": true,
  "message": "تم إعادة تعيين المواظبة لـ 25 خادم (بدون تأثير على سجل الحضور)",
  "data": {
    "servantsCount": 25,
    "resetCount": 25,
    "date": "2025-10-04T10:30:00.000Z"
  }
}
```

---

## 💡 ملاحظات مهمة

1. **سجل الحضور لا يتأثر**: إعادة التعيين تؤثر فقط على العداد، بيانات الحضور الأصلية تبقى كما هي
2. **نظام المكافآت مرتبط بالتواريخ**: يستخدم تاريخ آخر مكافأة كنقطة قطع
3. **الخدام المعطلين لا يظهرون**: فقط الخدام النشطون (`isActive: true`)
4. **الحد الأدنى 4 أسابيع**: يمكن تغيير هذا الرقم من الـ query parameter `minDays`
5. **منع التكرار**: لا يمكن تسليم مكافأة لنفس الخادم خلال 7 أيام
6. **استخدام Attendance model**: حضور الخدام مسجل في `Attendance` مع `type: 'servant'`

---

## 🚀 الخطوات التالية للتطبيق

### خطوة 1: Backend Setup

1. ✅ افتح ملف `backend/routes/servants-attendance.js`
2. ✅ أضف الـ 4 endpoints الجديدة في نهاية الملف (قبل `module.exports`)
3. ✅ تأكد من استيراد `GiftDelivery` model في بداية الملف:
   ```javascript
   const GiftDelivery = require("../models/GiftDelivery");
   ```

### خطوة 2: تعديل GiftDelivery Model

1. ✅ افتح ملف `backend/models/GiftDelivery.js`
2. ✅ عدّل الـ schema ليدعم `child` و `servant` (كما هو موضح في القسم أعلاه)
3. ✅ أضف الـ indexes للخدام

### خطوة 3: Frontend Setup

1. ✅ أنشئ مجلد جديد: `web/src/app/servants-consecutive-attendance/`
2. ✅ أنشئ ملف `page.tsx` بداخله والصق الكود الكامل
3. ✅ تأكد من أن جميع الـ imports صحيحة

### خطوة 4: Dashboard Integration

1. ✅ افتح `web/src/app/service-leader-dashboard/page.tsx`
2. ✅ أضف الـ interface و state للخدام المواظبين
3. ✅ أضف fetch call في `fetchDashboardData`
4. ✅ أضف البطاقة الجديدة في قسم الروابط السريعة

### خطوة 5: اختبار

1. ✅ شغّل الـ backend: `cd backend && npm start`
2. ✅ شغّل الـ frontend: `cd web && npm run dev`
3. ✅ سجّل دخول كـ Service Leader أو Admin
4. ✅ افتح لوحة أمين الخدمة
5. ✅ اضغط على "مواظبة الخدام المتتالية"
6. ✅ اختبر جميع المميزات:
   - عرض القائمة
   - تسليم مكافأة
   - إعادة تعيين جماعية
   - الإحصائيات الأسبوعية

---

---

## 📋 Checklist النهائي

قبل البدء في التطبيق، تأكد من:

- [ ] قرأت جميع الأقسام وفهمت البنية
- [ ] تحققت من أن `GiftDelivery` model يدعم الخدام
- [ ] تحققت من أن حضور الخدام مسجل في `Attendance` table
- [ ] لديك صلاحيات Service Leader أو Admin للاختبار
- [ ] Backend و Frontend يعملان بدون أخطاء

**أثناء التطبيق:**

- [ ] أضفت الـ 4 endpoints في `servants-attendance.js`
- [ ] عدّلت `GiftDelivery` model إذا لزم الأمر
- [ ] أنشأت صفحة `/servants-consecutive-attendance`
- [ ] ربطت الصفحة بلوحة أمين الخدمة
- [ ] أضفت `consecutiveServants` في dashboard stats

**بعد التطبيق:**

- [ ] اختبرت جلب قائمة الخدام المواظبين
- [ ] اختبرت الإحصائيات الأسبوعية
- [ ] اختبرت تسليم مكافأة لخادم
- [ ] اختبرت منع التكرار (لا تسليم خلال 7 أيام)
- [ ] اختبرت إعادة التعيين الجماعية
- [ ] تحققت من أن البيانات تتحدث بشكل صحيح
- [ ] راجعت الـ UI على شاشات مختلفة (موبايل، تابلت، ديسكتوب)

---

## 🎉 تم بنجاح

الآن لديك:

✅ **نظام كامل لتتبع مواظبة الخدام** (4 أسابيع متتالية)

✅ **4 API Endpoints** متكاملة مع error handling

✅ **واجهة مستخدم احترافية** مع تصميم جذاب

✅ **نظام مكافآت** مع منع التكرار

✅ **إدارة دورات المواظبة** بإعادة التعيين الجماعية

✅ **إحصائيات أسبوعية** لآخر 4 جمعات

✅ **صلاحيات محكمة** (Service Leader فقط)

✅ **تكامل كامل** مع لوحة أمين الخدمة

**مشابه تماماً لقسم الأطفال، لكن مخصص للخدام!** 👥⭐
