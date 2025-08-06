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
  ClockIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ServantsAttendanceModal from '@/components/ServantsAttendanceModal'
import { servantsAPI } from '@/services/api'

interface Servant {
  _id: string
  name: string
  phone?: string
  role?: string
  isPresent?: boolean
  attendanceId?: string
  notes?: string
  hasAttendanceRecord?: boolean
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
          hasAttendanceRecord: true
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
                hasAttendanceRecord: false
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
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 ml-4"
              >
                ← العودة
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                تسجيل حضور الخدام
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
          </div>
        )}
      </main>

      {/* Servants Attendance Modal */}
      <ServantsAttendanceModal
        isOpen={attendanceModal.isOpen}
        onClose={closeAttendanceModal}
        servant={attendanceModal.servant || { _id: '', name: '' }}
        onSave={handleAttendanceSave}
        onDelete={handleAttendanceDelete}
      />
    </div>
  )
}
