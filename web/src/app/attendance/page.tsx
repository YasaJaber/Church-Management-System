'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  CheckCircleIcon, 
  XCircleIcon,
  CalendarIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { childrenAPI, classesAPI, attendanceAPI } from '@/services/api'

interface Child {
  _id: string
  name: string
  age: number
  classId: string
  className?: string
  isPresent?: boolean
  attendanceId?: string
  notes?: string
  hasAttendanceRecord?: boolean // جديد: لمعرفة إذا كان له تسجيل حضور أصلاً
}

interface Class {
  _id: string
  name: string
}

export default function AttendancePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [children, setChildren] = useState<Child[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      loadClasses()
      
      // إذا كان المستخدم مدرس فصل أو خادم، يجب أن يعرض فصله فقط
      if ((user.role === 'classTeacher' || user.role === 'servant') && user.assignedClass) {
        setSelectedClass(user.assignedClass._id)
      }
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (selectedClass && selectedDate) {
      loadAttendanceData()
    }
  }, [selectedClass, selectedDate])

  const loadClasses = async () => {
    try {
      // إذا كان المستخدم مدرس فصل أو خادم، يجب أن يطلب فصله فقط
      if ((user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass) {
        // إذا كان مدرس فصل، يعرض فصله فقط
        const classData = {
          _id: user.assignedClass._id,
          name: user.assignedClass.name
        }
        setClasses([classData])
        setSelectedClass(user.assignedClass._id)
      } else {
        // إذا كان إداري، يعرض كل الفصول
        const response = await classesAPI.getAllClasses()
        if (response.success) {
          setClasses(response.data || [])
          if (response.data && response.data.length > 0) {
            setSelectedClass(response.data[0]._id)
          }
        } else {
          toast.error('فشل في تحميل بيانات الفصول')
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error)
      toast.error('حدث خطأ في تحميل البيانات')
    }
  }

  const loadAttendanceData = async () => {
    if (!selectedDate) return

    setLoading(true)
    try {
      console.log('Loading attendance data for date:', selectedDate, 'class:', selectedClass)
      
      // Use the new API to get children with attendance status
      const response = await attendanceAPI.getChildrenWithStatus(selectedDate, selectedClass)
      
      if (response.success && response.data) {
        console.log('Received children with status:', response.data.length)
        
        // Transform data to match our interface
        const childrenWithAttendance = response.data.map((child: any) => ({
          _id: child._id,
          name: child.name,
          age: child.age || 0,
          classId: child.class?._id || child.classId,
          className: child.className,
          isPresent: child.attendance?.status === 'present', // إذا لم يكن له تسجيل حضور = undefined (لا حضور ولا غياب)
          attendanceId: child.attendance?._id,
          notes: child.attendance?.notes || '',
          hasAttendanceRecord: !!child.attendance // لمعرفة إذا كان له تسجيل أصلاً
        }))
        
        setChildren(childrenWithAttendance)
        console.log('Set children:', childrenWithAttendance.length)
      } else {
        console.error('Failed to load children with status:', response.error)
        toast.error(response.error || 'فشل في تحميل بيانات الحضور')
        setChildren([])
      }
    } catch (error) {
      console.error('Error loading attendance data:', error)
      toast.error('حدث خطأ في تحميل البيانات')
      setChildren([])
    } finally {
      setLoading(false)
    }
  }

  const markPresent = async (childId: string) => {
    if (saving) return

    const childIndex = children.findIndex(c => c._id === childId)
    if (childIndex === -1) return

    const child = children[childIndex]

    // Optimistically update UI
    const updatedChildren = [...children]
    updatedChildren[childIndex] = { 
      ...child, 
      isPresent: true, 
      hasAttendanceRecord: true 
    }
    setChildren(updatedChildren)

    try {
      const response = await attendanceAPI.markAttendance({
        childId,
        date: selectedDate,
        status: 'present',
        classId: selectedClass
      })

      if (!response.success) {
        throw new Error(response.error || 'فشل في تسجيل الحضور')
      }

      toast.success('تم تسجيل الحضور')
    } catch (error: any) {
      console.error('Error marking present:', error)
      
      // Revert UI change on error
      const revertedChildren = [...children]
      revertedChildren[childIndex] = child
      setChildren(revertedChildren)
      
      toast.error(error.message || 'حدث خطأ في تسجيل الحضور')
    }
  }

  const markAbsent = async (childId: string) => {
    if (saving) return

    const childIndex = children.findIndex(c => c._id === childId)
    if (childIndex === -1) return

    const child = children[childIndex]

    // Optimistically update UI
    const updatedChildren = [...children]
    updatedChildren[childIndex] = { 
      ...child, 
      isPresent: false, 
      hasAttendanceRecord: true 
    }
    setChildren(updatedChildren)

    try {
      const response = await attendanceAPI.markAttendance({
        childId,
        date: selectedDate,
        status: 'absent',
        classId: selectedClass
      })

      if (!response.success) {
        throw new Error(response.error || 'فشل في تسجيل الغياب')
      }

      toast.success('تم تسجيل الغياب')
    } catch (error: any) {
      console.error('Error marking absent:', error)
      
      // Revert UI change on error
      const revertedChildren = [...children]
      revertedChildren[childIndex] = child
      setChildren(revertedChildren)
      
      toast.error(error.message || 'حدث خطأ في تسجيل الغياب')
    }
  }

  const markAllPresent = async () => {
    if (!selectedClass || !selectedDate || saving) return

    setSaving(true)
    try {
      const response = await attendanceAPI.markAllPresent(selectedClass, selectedDate)
      
      if (response.success) {
        toast.success('تم تسجيل حضور جميع الأطفال')
        loadAttendanceData()
      } else {
        toast.error(response.error || 'فشل في تسجيل الحضور الجماعي')
      }
    } catch (error) {
      console.error('Error marking all present:', error)
      toast.error('حدث خطأ في تسجيل الحضور الجماعي')
    } finally {
      setSaving(false)
    }
  }

  // حساب الإحصائيات
  const presentCount = children.filter(child => child.hasAttendanceRecord && child.isPresent).length
  const absentCount = children.filter(child => child.hasAttendanceRecord && !child.isPresent).length  
  const notRecordedCount = children.filter(child => !child.hasAttendanceRecord).length
  const totalCount = children.length
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">جاري تحميل بيانات الحضور...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 ml-4"
              >
                ← العودة
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                تسجيل الحضور
              </h1>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="text-sm text-gray-600">
                <ClockIcon className="w-4 h-4 inline ml-1" />
                {new Date().toLocaleTimeString('ar-EG')}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Class Selection - مخفي للمدرسين */}
            {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الفصل
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="input-field"
                  title="اختر الفصل"
                >
                  <option value="">اختر الفصل</option>
                  {classes.map(classItem => (
                    <option key={classItem._id} value={classItem._id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* عرض اسم الفصل للمدرسين */}
            {((user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الفصل
                </label>
                <div className="input-field bg-gray-50 text-gray-700">
                  {user.assignedClass.name}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                التاريخ
              </label>
              <div className="relative">
                <CalendarIcon className="w-5 h-5 absolute right-3 top-3 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field pr-10"
                  title="اختر التاريخ"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={markAllPresent}
                disabled={saving || !selectedClass || children.length === 0}
                className="btn-success w-full disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" color="text-white" className="ml-2" />
                    جاري الحفظ...
                  </>
                ) : (
                  'تسجيل حضور الكل'
                )}
              </button>
            </div>
          </div>

          {/* Statistics */}
          {selectedClass && children.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                <div className="text-sm text-gray-600">حاضر</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{absentCount}</div>
                <div className="text-sm text-gray-600">غائب</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{notRecordedCount}</div>
                <div className="text-sm text-gray-600">لم يُسجل</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{attendanceRate}%</div>
                <div className="text-sm text-gray-600">نسبة الحضور</div>
              </div>
            </div>
          )}
        </div>

        {/* Children List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 mt-4">جاري تحميل قائمة الأطفال...</p>
            </div>
          </div>
        ) : !selectedClass ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center text-gray-500">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>يرجى اختيار فصل لبدء تسجيل الحضور</p>
            </div>
          </div>
        ) : children.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center text-gray-500">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد أطفال مسجلين في هذا الفصل</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                قائمة أطفال {classes.find(c => c._id === selectedClass)?.name}
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {children.map((child) => (
                <div
                  key={child._id}
                  className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                    child.hasAttendanceRecord
                      ? child.isPresent 
                        ? 'bg-green-50 border-r-4 border-green-500' 
                        : 'bg-red-50 border-r-4 border-red-500'
                      : 'bg-gray-50 border-r-4 border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    child.hasAttendanceRecord
                      ? child.isPresent 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {child.name.charAt(0)}
                  </div>
                    </div>
                    <div className="mr-4">
                      <div className="text-sm font-medium text-gray-900">
                        {child.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {child.age} سنة
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 space-x-reverse">
                    {/* عرض حالة الحضور */}
                    {child.hasAttendanceRecord ? (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        child.isPresent 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {child.isPresent ? 'حاضر' : 'غائب'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                        لم يُسجل
                      </span>
                    )}
                    
                    {/* أزرار الحضور والغياب */}
                    <div className="flex space-x-1 space-x-reverse">
                      {/* زر الحضور */}
                      <button
                        onClick={() => markPresent(child._id)}
                        disabled={saving}
                        className={`p-2 rounded-full transition-colors ${
                          child.hasAttendanceRecord && child.isPresent
                            ? 'text-green-600 bg-green-100'
                            : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                        } disabled:opacity-50`}
                        title="تسجيل حضور"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                      </button>
                      
                      {/* زر الغياب */}
                      <button
                        onClick={() => markAbsent(child._id)}
                        disabled={saving}
                        className={`p-2 rounded-full transition-colors ${
                          child.hasAttendanceRecord && !child.isPresent
                            ? 'text-red-600 bg-red-100'
                            : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                        } disabled:opacity-50`}
                        title="تسجيل غياب"
                      >
                        <XCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
