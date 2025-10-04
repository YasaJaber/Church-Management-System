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
    } catch {
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
        const recordsCount = response.data.records?.length || 0
        await generateAttendancePDF({
          className: response.data.className,
          fromDate,
          toDate,
          records: response.data.records
        })
        
        if (recordsCount === 0) {
          toast.success('تم إنشاء التقرير - لا توجد سجلات في الفترة المحددة', {
            duration: 4000,
          })
        } else {
          const absentCount = response.data.records.filter((r: { status: string }) => r.status === 'absent').length
          const presentCount = response.data.records.filter((r: { status: string }) => r.status === 'present').length
          toast.success(`تم التصدير: ${presentCount} حضور، ${absentCount} غياب`)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تصدير التقرير'
      toast.error(errorMessage)
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
          <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-2">
            اختر الفصل
          </label>
          <select
            id="class-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={isLoadingClasses}
            aria-label="اختيار الفصل"
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
          <label htmlFor="from-date" className="block text-sm font-medium text-gray-700 mb-2">
            من تاريخ
          </label>
          <input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            placeholder="اختر التاريخ"
            aria-label="من تاريخ"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* تاريخ النهاية */}
        <div>
          <label htmlFor="to-date" className="block text-sm font-medium text-gray-700 mb-2">
            إلى تاريخ
          </label>
          <input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            placeholder="اختر التاريخ"
            aria-label="إلى تاريخ"
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
