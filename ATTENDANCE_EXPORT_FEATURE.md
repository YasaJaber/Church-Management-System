# نظام تصديرالحضور و الغياب إلى PDF
## Attendance Export to PDF System

---

## 📋 نظرة عامة | Overview

هذا النظام يتيح تصدير سجلات الغياب إلى ملفات PDF منسقة باللغة العربية. يدعم النظام نوعين من المستخدمين:
1. **المدرس (Teacher)**: يصدر غياب فصله فقط
2. **أمين الخدمة (Service Minister)**: يصدر غياب أي فصل

---

## 🎯 المتطلبات | Requirements

### المكتبات المطلوبة | Required Libraries

```json
{
  "html2pdf.js": "^0.10.1"
}
```

### التثبيت | Installation

```bash
npm install html2pdf.js
```

أو

```bash
yarn add html2pdf.js
```

---

## 📁 هيكل الملفات | File Structure

```
web/
├── src/
│   ├── utils/
│   │   └── exportToPDF.ts                    # مكتبة تصدير PDF
│   ├── services/
│   │   └── attendanceExportService.ts        # خدمة API للغياب
│   ├── components/
│   │   ├── ExportAttendanceTeacher.tsx       # مكون المدرس
│   │   └── ExportAttendanceAdmin.tsx         # مكون أمين الخدمة
│   └── app/
│       └── export-attendance/
│           └── page.tsx                       # صفحة التصدير

backend/
└── routes/
    └── attendance.js                          # إضافة endpoints جديدة
```

---

## 🔧 التفاصيل التقنية | Technical Details

---

## 1️⃣ مكتبة تصدير PDF
### File: `web/src/utils/exportToPDF.ts`

### الوظائف الرئيسية | Main Functions

#### `generateAttendancePDF(data: AttendanceReportData)`

**الوصف:** تقوم بإنشاء ملف PDF من بيانات الغياب

**المدخلات:**
```typescript
interface AttendanceReportData {
  className: string        // اسم الفصل
  fromDate: string        // تاريخ البداية
  toDate: string          // تاريخ النهاية
  records: AttendanceRecord[]  // سجلات الغياب
}

interface AttendanceRecord {
  date: string           // تاريخ الغياب
  studentName: string    // اسم الطالب
  status: 'present' | 'absent' | 'late'  // الحالة
  notes?: string        // ملاحظات إضافية
}
```

**المخرجات:**
```typescript
{
  success: boolean
  message: string
}
```

### مميزات التصميم | Design Features

1. **التنسيق العربي الكامل**
   - اتجاه النص من اليمين لليسار (RTL)
   - خطوط عربية واضحة
   - تاريخ عربي منسق

2. **العناصر الرئيسية في PDF:**
   - **الهيدر (Header):**
     - عنوان التقرير
     - اسم الكنيسة
     - خط فاصل
   
   - **معلومات التقرير (Info Section):**
     - اسم الفصل
     - تاريخ البداية
     - تاريخ النهاية
   
   - **الجدول (Table):**
     - التاريخ
     - اسم الطالب
     - الحالة (بألوان مختلفة)
     - الملاحظات
   
   - **الملخص (Summary):**
     - إجمالي السجلات
     - عدد الغيابات
     - عدد التأخيرات
   
   - **الفوتر (Footer):**
     - تاريخ ووقت إنشاء التقرير

3. **نظام الألوان:**
   - 🔴 أحمر (#e74c3c): الغياب
   - 🟢 أخضر (#27ae60): الحضور
   - 🟡 برتقالي (#f39c12): التأخير

4. **إعدادات PDF:**
   - الحجم: A4
   - الاتجاه: عمودي (Portrait)
   - الهوامش: 10mm
   - الجودة: عالية (98%)
   - التكبير: 2x للوضوح

### الكود الكامل:

```typescript
import html2pdf from 'html2pdf.js'

export interface AttendanceRecord {
  date: string
  studentName: string
  status: 'present' | 'absent' | 'late'
  notes?: string
}

export interface AttendanceReportData {
  className: string
  fromDate: string
  toDate: string
  records: AttendanceRecord[]
}

export const generateAttendancePDF = async (data: AttendanceReportData) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', sans-serif;
          direction: rtl;
          text-align: right;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        .header h1 {
          font-size: 24px;
          margin-bottom: 10px;
        }
        .header p {
          font-size: 14px;
          color: #666;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 5px;
        }
        .info-item {
          font-size: 14px;
        }
        .info-item strong {
          color: #2c3e50;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background-color: #2c3e50;
          color: white;
          padding: 12px;
          text-align: center;
          font-size: 14px;
        }
        td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: center;
          font-size: 13px;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .status-absent {
          color: #e74c3c;
          font-weight: bold;
        }
        .status-present {
          color: #27ae60;
        }
        .status-late {
          color: #f39c12;
          font-weight: bold;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #7f8c8d;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        .summary {
          margin-top: 20px;
          padding: 15px;
          background-color: #ecf0f1;
          border-radius: 5px;
        }
        .summary-item {
          display: inline-block;
          margin: 0 15px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>تقرير غياب الطلاب</h1>
        <p>كنيسة مارجرجس - مدارس الأحد</p>
      </div>
      
      <div class="info-section">
        <div class="info-item">
          <strong>الفصل:</strong> ${data.className}
        </div>
        <div class="info-item">
          <strong>من:</strong> ${new Date(data.fromDate).toLocaleDateString('ar-EG')}
        </div>
        <div class="info-item">
          <strong>إلى:</strong> ${new Date(data.toDate).toLocaleDateString('ar-EG')}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>اسم الطالب</th>
            <th>الحالة</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${data.records.map(record => `
            <tr>
              <td>${new Date(record.date).toLocaleDateString('ar-EG')}</td>
              <td>${record.studentName}</td>
              <td class="status-${record.status}">
                ${record.status === 'absent' ? 'غائب' : record.status === 'late' ? 'متأخر' : 'حاضر'}
              </td>
              <td>${record.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-item">
          <strong>إجمالي السجلات:</strong> ${data.records.length}
        </div>
        <div class="summary-item">
          <strong>عدد الغيابات:</strong> ${data.records.filter(r => r.status === 'absent').length}
        </div>
        <div class="summary-item">
          <strong>عدد التأخيرات:</strong> ${data.records.filter(r => r.status === 'late').length}
        </div>
      </div>

      <div class="footer">
        <p>تم إنشاء هذا التقرير بتاريخ ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
      </div>
    </body>
    </html>
  `

  const options = {
    margin: 10,
    filename: `attendance-report-${data.className}-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  try {
    await html2pdf().from(htmlContent).set(options).save()
    return { success: true, message: 'تم تصدير PDF بنجاح' }
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('فشل في إنشاء ملف PDF')
  }
}
```

---

## 2️⃣ خدمة API للغياب
### File: `web/src/services/attendanceExportService.ts`

### الوظائف الرئيسية | Main Functions

#### `getTeacherAttendance(params)`
**الوصف:** يجلب بيانات الغياب للمدرس (فصله فقط)

**المدخلات:**
```typescript
{
  fromDate: string  // تاريخ البداية (YYYY-MM-DD)
  toDate: string    // تاريخ النهاية (YYYY-MM-DD)
}
```

**API Endpoint:**
```
GET /api/attendance/export/teacher?fromDate=2024-09-01&toDate=2024-10-01
Headers: Authorization: Bearer <token>
```

**المخرجات المتوقعة:**
```typescript
{
  success: true,
  data: {
    className: "ابتدائي - الصف الأول",
    records: [
      {
        date: "2024-09-05",
        studentName: "مينا جرجس",
        status: "absent",
        notes: ""
      },
      {
        date: "2024-09-05",
        studentName: "مريم بطرس",
        status: "late",
        notes: "تأخر 15 دقيقة"
      }
    ]
  }
}
```

---

#### `getServiceMinisterAttendance(params)`
**الوصف:** يجلب بيانات الغياب لأمين الخدمة (أي فصل)

**المدخلات:**
```typescript
{
  classId: string   // معرف الفصل
  fromDate: string  // تاريخ البداية
  toDate: string    // تاريخ النهاية
}
```

**API Endpoint:**
```
GET /api/attendance/export/admin?classId=64abc123&fromDate=2024-09-01&toDate=2024-10-01
Headers: Authorization: Bearer <token>
```

---

#### `getAllClasses()`
**الوصف:** يجلب قائمة جميع الفصول (لأمين الخدمة)

**API Endpoint:**
```
GET /api/classes
Headers: Authorization: Bearer <token>
```

**المخرجات:**
```typescript
{
  success: true,
  data: [
    {
      _id: "64abc123",
      name: "ابتدائي - الصف الأول",
      level: "ابتدائي"
    },
    {
      _id: "64abc456",
      name: "إعدادي - الصف الثاني",
      level: "إعدادي"
    }
  ]
}
```

### الكود الكامل:

```typescript
import { API_BASE_URL } from './api'
import { EnhancedStorage } from '@/utils/storage'

export interface ExportAttendanceParams {
  classId?: string
  fromDate: string
  toDate: string
}

export const attendanceExportService = {
  // للمدرس - يجلب غياب فصله
  getTeacherAttendance: async (params: Omit<ExportAttendanceParams, 'classId'>) => {
    const token = EnhancedStorage.getAuthToken()
    const response = await fetch(
      `${API_BASE_URL}/attendance/export/teacher?fromDate=${params.fromDate}&toDate=${params.toDate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    )

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'فشل في جلب بيانات الغياب')
    }
    return data
  },

  // لأمين الخدمة - يجلب غياب أي فصل
  getServiceMinisterAttendance: async (params: ExportAttendanceParams) => {
    const token = EnhancedStorage.getAuthToken()
    const response = await fetch(
      `${API_BASE_URL}/attendance/export/admin?classId=${params.classId}&fromDate=${params.fromDate}&toDate=${params.toDate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    )

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'فشل في جلب بيانات الغياب')
    }
    return data
  },

  // جلب قائمة الفصول (لأمين الخدمة)
  getAllClasses: async () => {
    const token = EnhancedStorage.getAuthToken()
    const response = await fetch(`${API_BASE_URL}/classes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'فشل في جلب الفصول')
    }
    return data
  }
}
```

---

## 3️⃣ مكون المدرس
### File: `web/src/components/ExportAttendanceTeacher.tsx`

### الوصف | Description
واجهة بسيطة للمدرس لتصدير غياب فصله

### الميزات | Features
- اختيار تاريخ البداية والنهاية
- التحقق من صحة التواريخ
- عرض حالة التحميل
- رسائل نجاح/فشل

### الكود الكامل:

```typescript
'use client'

import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { attendanceExportService } from '@/services/attendanceExportService'
import { generateAttendancePDF } from '@/utils/exportToPDF'
import { useAuth } from '@/context/AuthContextSimple'

export const ExportAttendanceTeacher: React.FC = () => {
  const { user } = useAuth()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    // التحقق من التواريخ
    if (!fromDate || !toDate) {
      toast.error('الرجاء اختيار التاريخ من وإلى')
      return
    }

    if (new Date(fromDate) > new Date(toDate)) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية')
      return
    }

    try {
      setIsLoading(true)
      
      // جلب البيانات من API
      const response = await attendanceExportService.getTeacherAttendance({
        fromDate,
        toDate
      })

      // إنشاء PDF
      if (response.success && response.data) {
        await generateAttendancePDF({
          className: response.data.className,
          fromDate,
          toDate,
          records: response.data.records
        })
        toast.success('تم تصدير PDF بنجاح')
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل في تصدير التقرير')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">تصدير تقرير الغياب</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            من تاريخ
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            إلى تاريخ
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleExport}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'جاري التصدير...' : 'تصدير PDF'}
        </button>
      </div>
    </div>
  )
}
```

---

## 4️⃣ مكون أمين الخدمة
### File: `web/src/components/ExportAttendanceAdmin.tsx`

### الوصف | Description
واجهة متقدمة لأمين الخدمة لتصدير غياب أي فصل

### الميزات | Features
- قائمة منسدلة لاختيار الفصل
- اختيار تاريخ البداية والنهاية
- التحقق من صحة البيانات
- تحميل ديناميكي للفصول
- عرض حالة التحميل

### الكود الكامل:

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { attendanceExportService } from '@/services/attendanceExportService'
import { generateAttendancePDF } from '@/utils/exportToPDF'

interface ClassOption {
  _id: string
  name: string
  level: string
}

export const ExportAttendanceAdmin: React.FC = () => {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingClasses, setIsLoadingClasses] = useState(true)

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const response = await attendanceExportService.getAllClasses()
      if (response.success && response.data) {
        setClasses(response.data)
      }
    } catch (error: any) {
      toast.error('فشل في تحميل قائمة الفصول')
    } finally {
      setIsLoadingClasses(false)
    }
  }

  const handleExport = async () => {
    // التحقق من الفصل
    if (!selectedClass) {
      toast.error('الرجاء اختيار الفصل')
      return
    }

    // التحقق من التواريخ
    if (!fromDate || !toDate) {
      toast.error('الرجاء اختيار التاريخ من وإلى')
      return
    }

    if (new Date(fromDate) > new Date(toDate)) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية')
      return
    }

    try {
      setIsLoading(true)
      
      // جلب البيانات من API
      const response = await attendanceExportService.getServiceMinisterAttendance({
        classId: selectedClass,
        fromDate,
        toDate
      })

      // إنشاء PDF
      if (response.success && response.data) {
        await generateAttendancePDF({
          className: response.data.className,
          fromDate,
          toDate,
          records: response.data.records
        })
        toast.success('تم تصدير PDF بنجاح')
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل في تصدير التقرير')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">تصدير تقرير الغياب</h2>
      
      <div className="space-y-4">
        {/* اختيار الفصل */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اختر الفصل
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={isLoadingClasses}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- اختر الفصل --</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name} - {cls.level}
              </option>
            ))}
          </select>
        </div>

        {/* تاريخ البداية */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            من تاريخ
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* تاريخ النهاية */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            إلى تاريخ
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* زر التصدير */}
        <button
          onClick={handleExport}
          disabled={isLoading || isLoadingClasses}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'جاري التصدير...' : 'تصدير PDF'}
        </button>
      </div>
    </div>
  )
}
```

---

## 5️⃣ صفحة التصدير الموحدة
### File: `web/src/app/export-attendance/page.tsx`

### الوصف | Description
صفحة تجمع بين واجهة المدرس وأمين الخدمة حسب الصلاحيات

```typescript
'use client'

import React from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { ExportAttendanceTeacher } from '@/components/ExportAttendanceTeacher'
import { ExportAttendanceAdmin } from '@/components/ExportAttendanceAdmin'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ExportAttendancePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">تصدير سجلات الغياب</h1>
        
        {/* عرض المكون المناسب حسب الصلاحية */}
        {user.role === 'service_minister' || user.role === 'admin' ? (
          <ExportAttendanceAdmin />
        ) : (
          <ExportAttendanceTeacher />
        )}
      </div>
    </div>
  )
}
```

---

## 🔌 Backend API Endpoints

### ملف: `backend/routes/attendance.js`

يجب إضافة هذه الـ endpoints:

### 1. للمدرس - تصدير غياب فصله
```javascript
// GET /api/attendance/export/teacher
router.get('/export/teacher', auth, async (req, res) => {
  try {
    const { fromDate, toDate } = req.query
    const userId = req.user.id
    
    // التحقق من التواريخ
    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد تاريخ البداية والنهاية'
      })
    }

    // جلب الفصل المخصص للمدرس
    const user = await User.findById(userId).populate('assignedClass')
    
    if (!user || !user.assignedClass) {
      return res.status(404).json({
        success: false,
        message: 'لا يوجد فصل مخصص لهذا المدرس'
      })
    }

    // جلب سجلات الغياب في الفترة المحددة (الأيام التي فيها غياب فقط)
    const attendanceRecords = await Attendance.find({
      classId: user.assignedClass._id,
      date: {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      }
    })
    .populate('children.childId', 'name')
    .sort({ date: 1 })

    // تحويل البيانات للشكل المطلوب
    const records = []
    
    attendanceRecords.forEach(attendance => {
      attendance.children.forEach(child => {
        // فقط إضافة السجلات التي فيها غياب أو تأخير
        if (child.status === 'absent' || child.status === 'late') {
          records.push({
            date: attendance.date,
            studentName: child.childId.name,
            status: child.status,
            notes: child.notes || ''
          })
        }
      })
    })

    res.json({
      success: true,
      data: {
        className: user.assignedClass.name,
        records: records
      }
    })

  } catch (error) {
    console.error('Error exporting attendance:', error)
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات الغياب',
      error: error.message
    })
  }
})
```

### 2. لأمين الخدمة - تصدير غياب أي فصل
```javascript
// GET /api/attendance/export/admin
router.get('/export/admin', auth, async (req, res) => {
  try {
    const { classId, fromDate, toDate } = req.query
    const userId = req.user.id
    
    // التحقق من الصلاحيات
    const user = await User.findById(userId)
    
    if (!user || (user.role !== 'service_minister' && user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بهذه العملية'
      })
    }

    // التحقق من البيانات
    if (!classId || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الفصل وتاريخ البداية والنهاية'
      })
    }

    // جلب معلومات الفصل
    const classInfo = await Class.findById(classId)
    
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        message: 'الفصل غير موجود'
      })
    }

    // جلب سجلات الغياب في الفترة المحددة (الأيام التي فيها غياب فقط)
    const attendanceRecords = await Attendance.find({
      classId: classId,
      date: {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      }
    })
    .populate('children.childId', 'name')
    .sort({ date: 1 })

    // تحويل البيانات للشكل المطلوب
    const records = []
    
    attendanceRecords.forEach(attendance => {
      attendance.children.forEach(child => {
        // فقط إضافة السجلات التي فيها غياب أو تأخير
        if (child.status === 'absent' || child.status === 'late') {
          records.push({
            date: attendance.date,
            studentName: child.childId.name,
            status: child.status,
            notes: child.notes || ''
          })
        }
      })
    })

    res.json({
      success: true,
      data: {
        className: classInfo.name,
        records: records
      }
    })

  } catch (error) {
    console.error('Error exporting attendance:', error)
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات الغياب',
      error: error.message
    })
  }
})
```

---

## 🎨 واجهة المستخدم | User Interface

### للمدرس | Teacher View
```
┌─────────────────────────────────────┐
│      تصدير تقرير الغياب             │
├─────────────────────────────────────┤
│                                     │
│  من تاريخ                           │
│  ┌───────────────────────────────┐  │
│  │  [اختر التاريخ]               │  │
│  └───────────────────────────────┘  │
│                                     │
│  إلى تاريخ                          │
│  ┌───────────────────────────────┐  │
│  │  [اختر التاريخ]               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │      تصدير PDF                │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### لأمين الخدمة | Service Minister View
```
┌─────────────────────────────────────┐
│      تصدير تقرير الغياب             │
├─────────────────────────────────────┤
│                                     │
│  اختر الفصل                         │
│  ┌───────────────────────────────┐  │
│  │ ▼ [-- اختر الفصل --]         │  │
│  └───────────────────────────────┘  │
│                                     │
│  من تاريخ                           │
│  ┌───────────────────────────────┐  │
│  │  [اختر التاريخ]               │  │
│  └───────────────────────────────┘  │
│                                     │
│  إلى تاريخ                          │
│  ┌───────────────────────────────┐  │
│  │  [اختر التاريخ]               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │      تصدير PDF                │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## 📊 مثال على PDF الناتج

```
╔═══════════════════════════════════════════╗
║         تقرير غياب الطلاب                 ║
║      كنيسة مارجرجس - مدارس الأحد          ║
╠═══════════════════════════════════════════╣
║                                           ║
║  الفصل: ابتدائي - الصف الأول             ║
║  من: 1 سبتمبر 2024                       ║
║  إلى: 1 أكتوبر 2024                      ║
║                                           ║
╠═══════════════════════════════════════════╣
║                                           ║
║  التاريخ    │ اسم الطالب │ الحالة │ ملاحظات║
║ ─────────────────────────────────────────║
║  5/9/2024  │ مينا جرجس  │ غائب   │    -   ║
║  5/9/2024  │ مريم بطرس  │ متأخر  │ 15 دقيقة║
║  12/9/2024 │ بولا يوسف  │ غائب   │ مريض   ║
║  19/9/2024 │ مينا جرجس  │ غائب   │    -   ║
║  26/9/2024 │ جورج مجدي  │ متأخر  │ 10 دقائق║
║                                           ║
╠═══════════════════════════════════════════╣
║                                           ║
║  إجمالي السجلات: 5                       ║
║  عدد الغيابات: 3                         ║
║  عدد التأخيرات: 2                        ║
║                                           ║
╠═══════════════════════════════════════════╣
║ تم إنشاء هذا التقرير بتاريخ 4/10/2024   ║
╚═══════════════════════════════════════════╝
```

---

## 🔒 نظام الصلاحيات | Permissions System

### المدرس (Teacher)
- ✅ يصدر غياب فصله فقط
- ❌ لا يمكنه اختيار فصل آخر
- ✅ يختار الفترة الزمنية فقط

### أمين الخدمة (Service Minister / Admin)
- ✅ يصدر غياب أي فصل
- ✅ يختار الفصل من قائمة منسدلة
- ✅ يختار الفترة الزمنية
- ✅ يرى جميع الفصول

---

## ⚙️ خطوات التنفيذ | Implementation Steps

### 1. تثبيت المكتبة
```bash
cd web
npm install html2pdf.js
```

### 2. إنشاء الملفات Frontend
```bash
# Utils
touch src/utils/exportToPDF.ts

# Services
touch src/services/attendanceExportService.ts

# Components
touch src/components/ExportAttendanceTeacher.tsx
touch src/components/ExportAttendanceAdmin.tsx

# Page
mkdir -p src/app/export-attendance
touch src/app/export-attendance/page.tsx
```

### 3. تعديل Backend
- فتح `backend/routes/attendance.js`
- إضافة الـ endpoints الجديدة:
  - `/export/teacher`
  - `/export/admin`

### 4. اختبار النظام
```bash
# Start backend
cd backend
npm start

# Start frontend
cd ../web
npm run dev
```

---

## 🧪 سيناريوهات الاختبار | Test Scenarios

### 1. اختبار المدرس
1. تسجيل الدخول كمدرس
2. الذهاب إلى صفحة تصدير الغياب
3. اختيار تاريخ من: `2024-09-01`
4. اختيار تاريخ إلى: `2024-10-01`
5. الضغط على "تصدير PDF"
6. **النتيجة المتوقعة:** تحميل PDF يحتوي على غياب الطلاب في فصل المدرس فقط

### 2. اختبار أمين الخدمة
1. تسجيل الدخول كأمين خدمة
2. الذهاب إلى صفحة تصدير الغياب
3. اختيار فصل من القائمة المنسدلة
4. اختيار تاريخ من: `2024-09-01`
5. اختيار تاريخ إلى: `2024-10-01`
6. الضغط على "تصدير PDF"
7. **النتيجة المتوقعة:** تحميل PDF يحتوي على غياب الطلاب في الفصل المختار

### 3. اختبار التحقق من التواريخ
1. اختيار تاريخ نهاية أقدم من تاريخ البداية
2. الضغط على "تصدير PDF"
3. **النتيجة المتوقعة:** رسالة خطأ "تاريخ البداية يجب أن يكون قبل تاريخ النهاية"

### 4. اختبار الأيام الفارغة
1. اختيار فترة فيها أيام بدون غياب
2. الضغط على "تصدير PDF"
3. **النتيجة المتوقعة:** PDF يحتوي فقط على الأيام التي فيها سجلات غياب، بدون أيام فارغة

---

## 🚨 معالجة الأخطاء | Error Handling

### Frontend Errors
```typescript
// 1. عدم اختيار التواريخ
if (!fromDate || !toDate) {
  toast.error('الرجاء اختيار التاريخ من وإلى')
  return
}

// 2. تاريخ خاطئ
if (new Date(fromDate) > new Date(toDate)) {
  toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية')
  return
}

// 3. عدم اختيار الفصل (أمين الخدمة فقط)
if (!selectedClass) {
  toast.error('الرجاء اختيار الفصل')
  return
}

// 4. فشل في جلب البيانات
catch (error) {
  toast.error(error.message || 'فشل في تصدير التقرير')
}

// 5. فشل في إنشاء PDF
catch (error) {
  throw new Error('فشل في إنشاء ملف PDF')
}
```

### Backend Errors
```javascript
// 1. بيانات ناقصة
if (!fromDate || !toDate) {
  return res.status(400).json({
    success: false,
    message: 'يجب تحديد تاريخ البداية والنهاية'
  })
}

// 2. عدم وجود صلاحية
if (user.role !== 'service_minister' && user.role !== 'admin') {
  return res.status(403).json({
    success: false,
    message: 'غير مصرح لك بهذه العملية'
  })
}

// 3. فصل غير موجود
if (!classInfo) {
  return res.status(404).json({
    success: false,
    message: 'الفصل غير موجود'
  })
}

// 4. خطأ في السيرفر
catch (error) {
  res.status(500).json({
    success: false,
    message: 'فشل في جلب بيانات الغياب',
    error: error.message
  })
}
```

---

## 🎯 الميزات الرئيسية | Key Features

### ✅ 1. تصدير ذكي للبيانات
- يجلب فقط الأيام التي فيها سجلات غياب
- لا يظهر الأيام الفارغة
- ترتيب حسب التاريخ

### ✅ 2. تصميم احترافي
- تنسيق عربي كامل RTL
- ألوان واضحة للحالات
- تخطيط منظم ومقروء

### ✅ 3. أمان البيانات
- التحقق من الصلاحيات
- Authentication مطلوب
- كل مستخدم يرى بياناته فقط

### ✅ 4. تجربة مستخدم سلسة
- رسائل واضحة للأخطاء
- حالات تحميل
- تحقق من البيانات قبل الإرسال

### ✅ 5. مرونة في الاستخدام
- اختيار أي فترة زمنية
- تصدير شهري أو أسبوعي أو مخصص
- دعم جميع الفصول (لأمين الخدمة)

---

## 📝 ملاحظات مهمة | Important Notes

### 1. البيانات المصدرة
- ⚠️ يتم تصدير فقط سجلات **الغياب** و**التأخير**
- ⚠️ الأيام التي لم يتم فيها أخذ الغياب لا تظهر في PDF
- ⚠️ الطلاب الحاضرون لا يظهرون في التقرير

### 2. الصلاحيات
- المدرس يرى فصله فقط
- أمين الخدمة يرى جميع الفصول
- يجب تسجيل الدخول للوصول

### 3. الأداء
- التقارير الكبيرة قد تأخذ وقتاً
- يُنصح بتصدير فترات معقولة (شهر أو شهرين)

### 4. التوافقية
- يعمل على جميع المتصفحات الحديثة
- يدعم الطباعة المباشرة من PDF
- يدعم المشاركة والحفظ

---

## 🔄 التحديثات المستقبلية | Future Updates

### محتملة:
1. ✨ إضافة فلاتر إضافية (حسب الطالب)
2. ✨ تصدير Excel بالإضافة لـ PDF
3. ✨ إحصائيات مفصلة في التقرير
4. ✨ مقارنة بين فترات مختلفة
5. ✨ إرسال التقرير بالإيميل
6. ✨ جدولة تقارير تلقائية
7. ✨ رسوم بيانية في PDF

---

## 📞 الدعم والمساعدة | Support

في حال وجود أي مشاكل أو استفسارات:
1. راجع هذا الملف أولاً
2. تحقق من console للأخطاء
3. تأكد من تثبيت المكتبات المطلوبة
4. تحقق من اتصال Backend

---

## ✅ Checklist للتنفيذ

- [ ] تثبيت مكتبة `html2pdf.js`
- [ ] إنشاء `exportToPDF.ts`
- [ ] إنشاء `attendanceExportService.ts`
- [ ] إنشاء `ExportAttendanceTeacher.tsx`
- [ ] إنشاء `ExportAttendanceAdmin.tsx`
- [ ] إنشاء صفحة `export-attendance/page.tsx`
- [ ] تعديل Backend - إضافة `/export/teacher` endpoint
- [ ] تعديل Backend - إضافة `/export/admin` endpoint
- [ ] اختبار واجهة المدرس
- [ ] اختبار واجهة أمين الخدمة
- [ ] اختبار حالات الأخطاء
- [ ] اختبار PDF الناتج
- [ ] مراجعة الصلاحيات

---

**تم إنشاء هذا الملف بتاريخ:** 4 أكتوبر 2025  
**الإصدار:** 1.0  
**الحالة:** جاهز للتنفيذ ✅
