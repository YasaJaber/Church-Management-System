'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  DocumentCheckIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  EyeIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AttendanceModal from '@/components/AttendanceModal'
import ImageModal from '@/components/ImageModal'
import { childrenAPI, classesAPI, attendanceAPI } from '@/services/api'

interface Child {
  _id: string
  name: string
  classId: string
  className?: string
  isPresent?: boolean
  attendanceId?: string
  notes?: string
  hasAttendanceRecord?: boolean // جديد: لمعرفة إذا كان له تسجيل حضور أصلاً
  // Add batch editing state
  batchStatus?: "present" | "absent" | null
  batchNotes?: string
  // Image fields
  image?: string | null
  thumbnail?: string | null
  optimizedImage?: string | null
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
  const [attendanceModal, setAttendanceModal] = useState<{
    isOpen: boolean
    child: Child | null
  }>({
    isOpen: false,
    child: null
  })

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false)
  const [batchSaving, setBatchSaving] = useState(false)

  // Delete day confirmation dialog state
  const [showDeleteDayDialog, setShowDeleteDayDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingDay, setDeletingDay] = useState(false)

  // Image modal state
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean
    imageUrl: string | null
    childName: string
  }>({
    isOpen: false,
    imageUrl: null,
    childName: ''
  })

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
          // فلترة الفصول التجريبية أو الاختبارية
          const filteredClasses = (response.data || []).filter((cls: Class) => {
            const name = cls.name.toLowerCase()
            return !name.includes('تجريبي') &&
              !name.includes('اختبار') &&
              !name.includes('test') &&
              !name.includes('experimental')
          })

          setClasses(filteredClasses)
          if (filteredClasses.length > 0) {
            setSelectedClass(filteredClasses[0]._id)
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
    if (!selectedDate || !selectedClass) return

    setLoading(true)
    try {
      // Use the new API to get children with attendance status
      const response = await attendanceAPI.getChildrenWithStatus(selectedDate, selectedClass)

      if (response.success && response.data) {
        // Transform data to match our interface
        const childrenWithAttendance = response.data.map((child: any) => ({
          _id: child._id,
          name: child.name,
          classId: child.class?._id || child.classId,
          className: child.className,
          isPresent: child.attendance ? child.attendance.status === 'present' : undefined, // undefined means not recorded
          attendanceId: child.attendance?._id,
          notes: child.attendance?.notes || '',
          hasAttendanceRecord: !!child.attendance, // لمعرفة إذا كان له تسجيل أصلاً
          // Reset batch state when loading new data
          batchStatus: null,
          batchNotes: "",
          // Image fields
          image: child.image || null,
          thumbnail: child.thumbnail || null,
          optimizedImage: child.optimizedImage || null,
        }))

        setChildren(childrenWithAttendance)
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

  const openAttendanceModal = (child: Child) => {
    setAttendanceModal({
      isOpen: true,
      child
    })
  }

  const closeAttendanceModal = () => {
    setAttendanceModal({
      isOpen: false,
      child: null
    })
  }

  const handleAttendanceSave = async (childId: string, status: 'present' | 'absent', notes?: string) => {
    const childIndex = children.findIndex(c => c._id === childId)
    if (childIndex === -1) return

    const child = children[childIndex]

    // Optimistically update UI
    const updatedChildren = [...children]
    updatedChildren[childIndex] = {
      ...child,
      isPresent: status === 'present',
      hasAttendanceRecord: true,
      notes: notes || ''
    }
    setChildren(updatedChildren)

    try {
      const response = await attendanceAPI.markAttendance({
        childId,
        date: selectedDate,
        status,
        classId: selectedClass,
        notes
      })

      if (!response.success) {
        throw new Error(response.error || 'فشل في تسجيل الحضور')
      }

      // Refresh data to ensure consistency
      loadAttendanceData()
    } catch (error: any) {
      console.error('Error saving attendance:', error)

      // Revert UI change on error
      const revertedChildren = [...children]
      revertedChildren[childIndex] = child
      setChildren(revertedChildren)

      throw error // Re-throw to let modal handle the error
    }
  }

  const handleAttendanceDelete = async (childId: string) => {
    const childIndex = children.findIndex(c => c._id === childId)
    if (childIndex === -1) return

    const child = children[childIndex]

    // Optimistically update UI - remove attendance record
    const updatedChildren = [...children]
    updatedChildren[childIndex] = {
      ...child,
      isPresent: undefined,
      hasAttendanceRecord: false,
      notes: '',
      attendanceId: undefined
    }
    setChildren(updatedChildren)

    try {
      const response = await attendanceAPI.deleteAttendance(childId, selectedDate)

      if (!response.success) {
        throw new Error(response.error || 'فشل في مسح تسجيل الحضور')
      }

      // Refresh data to ensure consistency
      loadAttendanceData()
    } catch (error: any) {
      console.error('Error deleting attendance:', error)

      // Revert UI change on error
      const revertedChildren = [...children]
      revertedChildren[childIndex] = child
      setChildren(revertedChildren)

      throw error // Re-throw to let modal handle the error
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

  const handleDeleteDayAttendance = async () => {
    if (!selectedDate || deletingDay) return

    // التحقق من كتابة كلمة التأكيد
    if (deleteConfirmText !== 'مسح') {
      toast.error('يرجى كتابة "مسح" للتأكيد')
      return
    }

    setDeletingDay(true)
    try {
      const response = await attendanceAPI.deleteAttendanceByDay(selectedDate, selectedClass)

      if (response.success) {
        toast.success(`تم مسح ${response.data.deletedCount} سجل حضور بنجاح`)
        setShowDeleteDayDialog(false)
        setDeleteConfirmText('')
        loadAttendanceData()
      } else {
        toast.error(response.error || 'فشل في مسح سجلات الحضور')
      }
    } catch (error) {
      console.error('Error deleting day attendance:', error)
      toast.error('حدث خطأ في مسح سجلات الحضور')
    } finally {
      setDeletingDay(false)
    }
  }

  // Toggle child's batch status
  const toggleChildBatchStatus = (
    childId: string,
    status: "present" | "absent"
  ) => {
    setChildren((prev) =>
      prev.map((child) => {
        if (child._id === childId) {
          const newStatus = child.batchStatus === status ? null : status;
          return {
            ...child,
            batchStatus: newStatus,
          };
        }
        return child;
      })
    );
  };

  // Update batch notes for a child
  const updateChildBatchNotes = (childId: string, notes: string) => {
    setChildren((prev) =>
      prev.map((child) => {
        if (child._id === childId) {
          return {
            ...child,
            batchNotes: notes,
          };
        }
        return child;
      })
    );
  };

  // Save all batch changes
  const saveBatchAttendance = async () => {
    if (!selectedDate) {
      toast.error("يرجى تحديد التاريخ");
      return;
    }

    // Get children with batch changes
    const changedChildren = children.filter(
      (child) => child.batchStatus !== null && child.batchStatus !== undefined
    );

    if (changedChildren.length === 0) {
      toast.error("لا توجد تغييرات لحفظها");
      return;
    }

    setBatchSaving(true);
    try {
      const attendanceData = changedChildren.map((child) => ({
        childId: child._id,
        status: child.batchStatus!,
        notes: child.batchNotes || "",
      }));

      const response = await attendanceAPI.batchSave(
        attendanceData,
        selectedDate
      );

      if (response.success) {
        const { successful, errors, summary } = response.data;

        if (summary.successful > 0) {
          toast.success(`تم تسجيل حضور ${summary.successful} طفل بنجاح`);
        }

        if (summary.failed > 0) {
          toast.error(`فشل في تسجيل ${summary.failed} سجل`);
          console.error("Failed records:", errors);
        }

        // Reset batch mode and reload data
        setBatchMode(false);
        setChildren((prev) =>
          prev.map((child) => ({
            ...child,
            batchStatus: null,
            batchNotes: "",
          }))
        );

        // Reload attendance data
        await loadAttendanceData();
      } else {
        throw new Error(response.error || "فشل في تسجيل الحضور الجماعي");
      }
    } catch (error: any) {
      console.error("Error saving batch attendance:", error);
      toast.error(error.message || "حدث خطأ في تسجيل الحضور الجماعي");
    } finally {
      setBatchSaving(false);
    }
  };

  // Cancel batch mode
  const cancelBatchMode = () => {
    setBatchMode(false);
    setChildren((prev) =>
      prev.map((child) => ({
        ...child,
        batchStatus: null,
        batchNotes: "",
      }))
    );
  };

  // Mark all as present in batch mode
  const markAllPresentBatch = () => {
    setChildren((prev) =>
      prev.map((child) => ({
        ...child,
        batchStatus: "present",
      }))
    );
  };

  // Mark all as absent in batch mode
  const markAllAbsentBatch = () => {
    setChildren((prev) =>
      prev.map((child) => ({
        ...child,
        batchStatus: "absent",
      }))
    );
  };

  // Render batch controls
  const renderBatchControls = () => {
    if (!batchMode) return null;

    const changedCount = children.filter(
      (child) => child.batchStatus !== null
    ).length;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DocumentCheckIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">
              وضع التسجيل الجماعي
            </h3>
          </div>
          <div className="text-sm text-blue-600">تم تحديد {changedCount} طفل</div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={markAllPresentBatch}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors"
          >
            تحديد الكل حاضر
          </button>
          <button
            onClick={markAllAbsentBatch}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors"
          >
            تحديد الكل غائب
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveBatchAttendance}
            disabled={batchSaving || changedCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {batchSaving && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            حفظ الحضور ({changedCount})
          </button>
          <button
            onClick={cancelBatchMode}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    );
  };

  // Open image modal
  const openImageModal = (imageUrl: string | null | undefined, childName: string) => {
    if (!imageUrl) return
    setImageModal({
      isOpen: true,
      imageUrl: imageUrl.replace('/upload/', '/upload/f_auto,q_auto/'), // Use optimized version
      childName
    })
  }

  // Close image modal
  const closeImageModal = () => {
    setImageModal({
      isOpen: false,
      imageUrl: null,
      childName: ''
    })
  }

  // Render child row for batch mode
  const renderChildRowBatch = (child: Child) => {
    const currentStatus =
      child.batchStatus !== null
        ? child.batchStatus
        : child.hasAttendanceRecord
          ? child.isPresent
            ? "present"
            : "absent"
          : null;

    return (
      <div key={child._id} className="bg-white border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Child Image */}
            <div className="relative flex-shrink-0">
              {child.thumbnail || child.image ? (
                <img
                  src={child.thumbnail || child.image || ''}
                  alt={child.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-2 border-gray-200">
                  <UserIcon className="w-6 h-6 text-blue-500" />
                </div>
              )}
              {/* Preview button */}
              {(child.thumbnail || child.image) && (
                <button
                  onClick={() => openImageModal(child.optimizedImage || child.image, child.name)}
                  className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
                  title="عرض الصورة"
                >
                  <EyeIcon className="w-3 h-3 text-blue-600" />
                </button>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{child.name}</h3>
              <p className="text-sm text-gray-500">{child.className}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleChildBatchStatus(child._id, "present")}
              className={`p-2 rounded-full transition-colors ${currentStatus === "present"
                  ? "bg-green-100 text-green-600 ring-2 ring-green-300"
                  : "bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500"
                }`}
              title="حاضر"
            >
              <CheckCircleIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => toggleChildBatchStatus(child._id, "absent")}
              className={`p-2 rounded-full transition-colors ${currentStatus === "absent"
                  ? "bg-red-100 text-red-600 ring-2 ring-red-300"
                  : "bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"
                }`}
              title="غائب"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div>
          <textarea
            value={child.batchNotes || child.notes || ""}
            onChange={(e) => updateChildBatchNotes(child._id, e.target.value)}
            placeholder="ملاحظات..."
            className="w-full p-2 border border-gray-200 rounded-md text-sm resize-none"
            rows={2}
          />
        </div>
      </div>
    );
  };

  // فلترة الأطفال حسب البحث
  const filteredChildren = children.filter(child =>
    child.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            <div className="flex items-center min-w-0 flex-1">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 ml-4 flex-shrink-0"
              >
                ← العودة
              </button>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                تسجيل الحضور
                {user?.assignedClass && (
                  <span className="text-blue-600 font-medium text-base"> - {user.assignedClass.name}</span>
                )}
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 space-x-reverse">
              {!batchMode && (
                <button
                  onClick={() => setBatchMode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <DocumentCheckIcon className="h-4 w-4" />
                  التسجيل الجماعي
                </button>
              )}
              <div className="text-sm text-gray-600 hidden sm:flex items-center">
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
                  disabled={batchMode}
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
                  disabled={batchMode}
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={markAllPresent}
                disabled={saving || !selectedClass || children.length === 0 || batchMode}
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

          {/* Delete Day Attendance Button */}
          {!batchMode && selectedClass && (presentCount > 0 || absentCount > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteDayDialog(true)}
                disabled={saving || deletingDay}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                مسح الحضور في هذا اليوم
              </button>
              <p className="text-xs text-red-600 text-center mt-2">
                ⚠️ هذا الإجراء سيمسح كل سجلات الحضور في هذا التاريخ نهائياً
              </p>
            </div>
          )}

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

        {/* Batch Controls */}
        {renderBatchControls()}

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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-medium text-gray-900">
                  قائمة أطفال {classes.find(c => c._id === selectedClass)?.name}
                </h2>
                {/* Search Input */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن طفل..."
                    className="w-full sm:w-64 pl-8 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="مسح البحث"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {batchMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {filteredChildren.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>لا توجد نتائج للبحث "{searchQuery}"</p>
                  </div>
                ) : (
                  filteredChildren.map((child) => renderChildRowBatch(child))
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredChildren.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>لا توجد نتائج للبحث "{searchQuery}"</p>
                  </div>
                ) : (
                  filteredChildren.map((child) => (
                    <div
                      key={child._id}
                      className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${child.hasAttendanceRecord
                          ? child.isPresent
                            ? 'bg-green-50 border-r-4 border-green-500'
                            : 'bg-red-50 border-r-4 border-red-500'
                          : 'bg-gray-50 border-r-4 border-gray-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Child Image with preview button */}
                        <div className="relative flex-shrink-0">
                          {child.thumbnail || child.image ? (
                            <img
                              src={child.thumbnail || child.image || ''}
                              alt={child.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                              loading="lazy"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${child.hasAttendanceRecord
                                ? child.isPresent
                                  ? 'bg-green-100 text-green-600 border-green-200'
                                  : 'bg-red-100 text-red-600 border-red-200'
                                : 'bg-gray-100 text-gray-400 border-gray-200'
                              }`}>
                              <UserIcon className="w-6 h-6" />
                            </div>
                          )}
                          {/* Preview button */}
                          {(child.thumbnail || child.image) && (
                            <button
                              onClick={() => openImageModal(child.optimizedImage || child.image, child.name)}
                              className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 shadow-md hover:bg-blue-700 transition-colors"
                              title="عرض الصورة"
                            >
                              <EyeIcon className="w-3 h-3 text-white" />
                            </button>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {child.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {child.className}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 space-x-reverse">
                        {/* عرض حالة الحضور */}
                        {child.hasAttendanceRecord ? (
                          <span className={`px-2 py-1 text-xs rounded-full ${child.isPresent
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {child.isPresent ? 'حاضر' : 'غائب'}
                            {child.notes && (
                              <span className="mr-1 text-gray-500" title={child.notes}>📝</span>
                            )}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                            لم يُسجل
                          </span>
                        )}

                        {/* زر تسجيل الحضور */}
                        <button
                          onClick={() => openAttendanceModal(child)}
                          disabled={saving}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          title="تسجيل الحضور"
                        >
                          {child.hasAttendanceRecord ? 'تعديل' : 'تسجيل'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Attendance Modal - only show in normal mode */}
      {!batchMode && (
        <AttendanceModal
          isOpen={attendanceModal.isOpen}
          onClose={closeAttendanceModal}
          child={attendanceModal.child || { _id: '', name: '' }}
          onSave={handleAttendanceSave}
          onDelete={handleAttendanceDelete}
        />
      )}

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModal.isOpen}
        imageUrl={imageModal.imageUrl || ''}
        childName={imageModal.childName}
        onClose={closeImageModal}
      />

      {/* Delete Day Confirmation Dialog */}
      {showDeleteDayDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-red-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">تأكيد مسح الحضور</h3>
                <p className="text-sm text-gray-500">عملية لا يمكن التراجع عنها</p>
              </div>
            </div>

            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ تحذير: هذا الإجراء خطير!
              </p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>سيتم مسح <strong>كل</strong> سجلات الحضور في التاريخ: <strong>{selectedDate}</strong></li>
                <li>المسح نهائي من قاعدة البيانات</li>
                <li>لا يمكن استرجاع البيانات بعد المسح</li>
                <li>سيعود الأطفال كأن الحضور لم يُسجل أصلاً</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                للتأكيد، اكتب كلمة "<strong className="text-red-600">مسح</strong>" في الحقل أدناه:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='اكتب "مسح" للتأكيد'
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={deletingDay}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDayDialog(false)
                  setDeleteConfirmText('')
                }}
                disabled={deletingDay}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteDayAttendance}
                disabled={deletingDay || deleteConfirmText !== 'مسح'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors font-bold flex items-center justify-center gap-2"
              >
                {deletingDay ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    جاري المسح...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    مسح نهائياً
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
