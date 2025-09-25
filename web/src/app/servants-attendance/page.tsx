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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ServantsAttendanceModal from '@/components/ServantsAttendanceModal'
import { servantsAPI, servantsAttendanceAPI } from '@/services/api'

interface Servant {
  _id: string
  name: string
  phone?: string
  role?: string
  isPresent?: boolean
  attendanceId?: string
  notes?: string
  hasAttendanceRecord?: boolean
  // Add batch editing state
  batchStatus?: "present" | "absent" | "excused" | null
  batchNotes?: string
}

export default function ServantsAttendancePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [servants, setServants] = useState<Servant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [attendanceModal, setAttendanceModal] = useState<{
    isOpen: boolean
    servant: Servant | null
  }>({
    isOpen: false,
    servant: null
  })

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false)
  const [batchSaving, setBatchSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      // التحقق من الصلاحية - فقط الادمن وأمين الخدمة
      if (user.role === 'admin' || user.role === 'serviceLeader') {
        loadAttendanceData()
      } else {
        toast.error('ليس لديك صلاحية للوصول لهذه الصفحة')
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, user, selectedDate, router])

  const loadAttendanceData = async () => {
    setLoading(true)
    try {
      console.log('Loading servants attendance for date:', selectedDate)
      
      // الحصول على بيانات الحضور للخدام للتاريخ المحدد
      const response = await servantsAPI.getAttendanceByDate(selectedDate)
      
      if (response.success) {
        console.log('Attendance data received:', response.data)
        
        // تحويل البيانات لتطابق تنسيق الواجهة
        const servantsWithAttendance = response.data.map((record: any) => ({
          _id: record.person._id,
          name: record.person.name,
          phone: record.person.phone,
          role: record.person.role,
          isPresent: record.status === 'present',
          attendanceId: record._id,
          notes: record.notes || '',
          hasAttendanceRecord: true,
          // Reset batch state when loading new data
          batchStatus: null,
          batchNotes: "",
        }))
        
        // الحصول على قائمة كل الخدام والتحقق من من لم يُسجل حضوره
        const allServantsResponse = await servantsAPI.getAll()
        if (allServantsResponse.success) {
          const allServants = allServantsResponse.data.map((servant: any) => {
            const hasRecord = servantsWithAttendance.find((s: any) => s._id === servant._id)
            if (hasRecord) {
              return hasRecord
            } else {
              return {
                _id: servant._id,
                name: servant.name,
                phone: servant.phone,
                role: servant.role,
                isPresent: undefined,
                attendanceId: undefined,
                notes: '',
                hasAttendanceRecord: false,
                // Reset batch state when loading new data
                batchStatus: null,
                batchNotes: "",
              }
            }
          })
          
          setServants(allServants)
        } else {
          setServants(servantsWithAttendance)
        }
      } else {
        console.error('Failed to load servants attendance:', response.error)
        toast.error(response.error || 'فشل في تحميل بيانات الحضور')
        setServants([])
      }
    } catch (error) {
      console.error('Error loading servants attendance data:', error)
      toast.error('حدث خطأ في تحميل البيانات')
      setServants([])
    } finally {
      setLoading(false)
    }
  }

  const openAttendanceModal = (servant: Servant) => {
    setAttendanceModal({
      isOpen: true,
      servant
    })
  }

  const closeAttendanceModal = () => {
    setAttendanceModal({
      isOpen: false,
      servant: null
    })
  }

  const handleAttendanceSave = async (servantId: string, status: 'present' | 'absent', notes?: string) => {
    const servantIndex = servants.findIndex(s => s._id === servantId)
    if (servantIndex === -1) return

    const servant = servants[servantIndex]

    // تحديث الواجهة فورياً
    const updatedServants = [...servants]
    updatedServants[servantIndex] = { 
      ...servant, 
      isPresent: status === 'present', 
      hasAttendanceRecord: true,
      notes: notes || ''
    }
    setServants(updatedServants)

    try {
      const response = await servantsAPI.markAttendance({
        servantId,
        date: selectedDate,
        status,
        notes
      })

      if (!response.success) {
        throw new Error(response.error || 'فشل في تسجيل الحضور')
      }

      // إعادة تحميل البيانات للتأكد من التناسق
      loadAttendanceData()
    } catch (error: any) {
      console.error('Error saving servant attendance:', error)
      
      // إعادة البيانات السابقة في حالة الخطأ
      const revertedServants = [...servants]
      revertedServants[servantIndex] = servant
      setServants(revertedServants)
      
      throw error // إعادة رمي الخطأ ليتعامل معه المودال
    }
  }

  const handleAttendanceDelete = async (servantId: string) => {
    const servantIndex = servants.findIndex(s => s._id === servantId)
    if (servantIndex === -1) return

    const servant = servants[servantIndex]

    // تحديث الواجهة فورياً - إزالة تسجيل الحضور
    const updatedServants = [...servants]
    updatedServants[servantIndex] = { 
      ...servant, 
      isPresent: undefined,
      hasAttendanceRecord: false,
      notes: '',
      attendanceId: undefined
    }
    setServants(updatedServants)

    try {
      const response = await servantsAPI.deleteAttendance(servantId, selectedDate)

      if (!response.success) {
        throw new Error(response.error || 'فشل في مسح تسجيل الحضور')
      }

      // إعادة تحميل البيانات للتأكد من التناسق
      loadAttendanceData()
    } catch (error: any) {
      console.error('Error deleting servant attendance:', error)
      
      // إعادة البيانات السابقة في حالة الخطأ
      const revertedServants = [...servants]
      revertedServants[servantIndex] = servant
      setServants(revertedServants)
      
      throw error // إعادة رمي الخطأ ليتعامل معه المودال
    }
  }

  const markAllPresent = async () => {
    if (!selectedDate || saving) return

    setSaving(true)
    try {
      const response = await servantsAPI.markAllPresent(selectedDate)
      
      if (response.success) {
        toast.success('تم تسجيل حضور جميع الخدام')
        loadAttendanceData()
      } else {
        toast.error(response.error || 'فشل في تسجيل الحضور الجماعي')
      }
    } catch (error) {
      console.error('Error marking all servants present:', error)
      toast.error('حدث خطأ في تسجيل الحضور الجماعي')
    } finally {
      setSaving(false)
    }
  }

  // Toggle servant's batch status
  const toggleServantBatchStatus = (
    servantId: string,
    status: "present" | "absent" | "excused"
  ) => {
    setServants((prev) =>
      prev.map((servant) => {
        if (servant._id === servantId) {
          const newStatus = servant.batchStatus === status ? null : status;
          return {
            ...servant,
            batchStatus: newStatus,
          };
        }
        return servant;
      })
    );
  };

  // Update batch notes for a servant
  const updateServantBatchNotes = (servantId: string, notes: string) => {
    setServants((prev) =>
      prev.map((servant) => {
        if (servant._id === servantId) {
          return {
            ...servant,
            batchNotes: notes,
          };
        }
        return servant;
      })
    );
  };

  // Save all batch changes
  const saveBatchAttendance = async () => {
    if (!selectedDate) {
      toast.error("يرجى تحديد التاريخ");
      return;
    }

    // Get servants with batch changes
    const changedServants = servants.filter(
      (servant) =>
        servant.batchStatus !== null && servant.batchStatus !== undefined
    );

    if (changedServants.length === 0) {
      toast.error("لا توجد تغييرات لحفظها");
      return;
    }

    setBatchSaving(true);
    try {
      console.log(
        "Saving batch attendance for",
        changedServants.length,
        "servants"
      );

      const attendanceData = changedServants.map((servant) => ({
        servantId: servant._id,
        status: servant.batchStatus!,
        notes: servant.batchNotes || "",
      }));

      const response = await servantsAttendanceAPI.batchSave(
        attendanceData,
        selectedDate
      );

      if (response.success) {
        const { successful, errors, summary } = response.data;

        if (summary.successful > 0) {
          toast.success(`تم تسجيل حضور ${summary.successful} خادم بنجاح`);
        }

        if (summary.failed > 0) {
          toast.error(`فشل في تسجيل ${summary.failed} سجل`);
          console.error("Failed records:", errors);
        }

        // Reset batch mode and reload data
        setBatchMode(false);
        setServants((prev) =>
          prev.map((servant) => ({
            ...servant,
            batchStatus: null,
            batchNotes: "",
          }))
        );

        // Reload attendance data
        await loadAttendanceData();
      } else {
        throw new Error(response.error || "فشل في تسجيل حضور الخدام الجماعي");
      }
    } catch (error: any) {
      console.error("Error saving servants batch attendance:", error);
      toast.error(error.message || "حدث خطأ في تسجيل حضور الخدام الجماعي");
    } finally {
      setBatchSaving(false);
    }
  };

  // Cancel batch mode
  const cancelBatchMode = () => {
    setBatchMode(false);
    setServants((prev) =>
      prev.map((servant) => ({
        ...servant,
        batchStatus: null,
        batchNotes: "",
      }))
    );
  };

  // Mark all as present in batch mode
  const markAllPresentBatch = () => {
    setServants((prev) =>
      prev.map((servant) => ({
        ...servant,
        batchStatus: "present",
      }))
    );
  };

  // Mark all as absent in batch mode
  const markAllAbsentBatch = () => {
    setServants((prev) =>
      prev.map((servant) => ({
        ...servant,
        batchStatus: "absent",
      }))
    );
  };

  // Render batch controls
  const renderBatchControls = () => {
    if (!batchMode) return null;

    const changedCount = servants.filter(
      (servant) => servant.batchStatus !== null
    ).length;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DocumentCheckIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">
              وضع التسجيل الجماعي للخدام
            </h3>
          </div>
          <div className="text-sm text-blue-600">تم تحديد {changedCount} خادم</div>
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

  // Render servant row for batch mode
  const renderServantRowBatch = (servant: Servant) => {
    const currentStatus =
      servant.batchStatus !== null
        ? servant.batchStatus
        : servant.hasAttendanceRecord
        ? servant.isPresent
          ? "present"
          : "absent"
        : null;

    return (
      <div key={servant._id} className="bg-white border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-medium text-gray-900">{servant.name}</h3>
            <p className="text-sm text-gray-500">{servant.role}</p>
            {servant.phone && (
              <p className="text-xs text-gray-400">{servant.phone}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleServantBatchStatus(servant._id, "present")}
              className={`p-2 rounded-full transition-colors ${
                currentStatus === "present"
                  ? "bg-green-100 text-green-600 ring-2 ring-green-300"
                  : "bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500"
              }`}
              title="حاضر"
            >
              <CheckCircleIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => toggleServantBatchStatus(servant._id, "absent")}
              className={`p-2 rounded-full transition-colors ${
                currentStatus === "absent"
                  ? "bg-red-100 text-red-600 ring-2 ring-red-300"
                  : "bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"
              }`}
              title="غائب"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => toggleServantBatchStatus(servant._id, "excused")}
              className={`p-2 rounded-full transition-colors ${
                currentStatus === "excused"
                  ? "bg-yellow-100 text-yellow-600 ring-2 ring-yellow-300"
                  : "bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-500"
              }`}
              title="معذور"
            >
              <ExclamationTriangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div>
          <textarea
            value={servant.batchNotes || servant.notes || ""}
            onChange={(e) => updateServantBatchNotes(servant._id, e.target.value)}
            placeholder="ملاحظات..."
            className="w-full p-2 border border-gray-200 rounded-md text-sm resize-none"
            rows={2}
          />
        </div>
      </div>
    );
  };

  // حساب الإحصائيات
  const presentCount = servants.filter(servant => servant.hasAttendanceRecord && servant.isPresent).length
  const absentCount = servants.filter(servant => servant.hasAttendanceRecord && !servant.isPresent).length  
  const notRecordedCount = servants.filter(servant => !servant.hasAttendanceRecord).length
  const totalCount = servants.length
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
                <span className="hidden sm:inline">تسجيل حضور الخدام</span>
                <span className="sm:hidden">حضور الخدام</span>
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
                disabled={saving || servants.length === 0}
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
          {servants.length > 0 && (
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

        {/* Servants List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 mt-4">جاري تحميل قائمة الخدام...</p>
            </div>
          </div>
        ) : servants.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center text-gray-500">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد خدام مسجلين</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                قائمة الخدام
              </h2>
            </div>
            
            {batchMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {servants.map((servant) => renderServantRowBatch(servant))}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {servants.map((servant) => (
                <div
                  key={servant._id}
                  className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                    servant.hasAttendanceRecord
                      ? servant.isPresent 
                        ? 'bg-green-50 border-r-4 border-green-500' 
                        : 'bg-red-50 border-r-4 border-red-500'
                      : 'bg-gray-50 border-r-4 border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        servant.hasAttendanceRecord
                          ? servant.isPresent 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {servant.name.charAt(0)}
                      </div>
                    </div>
                    <div className="mr-4">
                      <div className="text-sm font-medium text-gray-900">
                        {servant.name}
                      </div>
                      {servant.role && (
                        <div className="text-sm text-gray-500">
                          {servant.role}
                        </div>
                      )}
                      {servant.phone && (
                        <div className="text-sm text-gray-500">
                          📞 {servant.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 space-x-reverse">
                    {/* عرض حالة الحضور */}
                    {servant.hasAttendanceRecord ? (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        servant.isPresent 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {servant.isPresent ? 'حاضر' : 'غائب'}
                        {servant.notes && (
                          <span className="mr-1 text-gray-500" title={servant.notes}>📝</span>
                        )}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                        لم يُسجل
                      </span>
                    )}
                    
                    {/* زر تسجيل الحضور */}
                    <button
                      onClick={() => openAttendanceModal(servant)}
                      disabled={saving}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      title="تسجيل الحضور"
                    >
                      {servant.hasAttendanceRecord ? 'تعديل' : 'تسجيل'}
                    </button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Servants Attendance Modal - only show in normal mode */}
      {!batchMode && (
        <ServantsAttendanceModal
          isOpen={attendanceModal.isOpen}
          onClose={closeAttendanceModal}
          servant={attendanceModal.servant || { _id: '', name: '' }}
          onSave={handleAttendanceSave}
          onDelete={handleAttendanceDelete}
        />
      )}
    </div>
  )
}
