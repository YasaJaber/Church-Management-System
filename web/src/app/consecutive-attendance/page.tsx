'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { classesAPI, API_BASE_URL } from '@/services/api'
import { EyeIcon, UserIcon } from '@heroicons/react/24/outline'
import ImageModal from '@/components/ImageModal'

interface ConsecutiveChild {
  name: string
  consecutiveWeeks: number
  childId: string
  image?: string | null
  thumbnail?: string | null
  optimizedImage?: string | null
}

interface ClassData {
  className: string
  classId: string
  children: ConsecutiveChild[]
}

interface ClassOption {
  _id: string
  name: string
  stage: string
  grade: string
}

interface WeeklyAttendance {
  date: string
  totalChildren: number
  presentCount: number
  attendanceRate: number
}

export default function ConsecutiveAttendancePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [classesData, setClassesData] = useState<ClassData[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [weeklyData, setWeeklyData] = useState<WeeklyAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deliveryLoading, setDeliveryLoading] = useState<string | null>(null)

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

  const fetchClasses = useCallback(async () => {
    try {
      const response = await classesAPI.getAll()
      if (response.success && response.data) {
        setClasses(response.data)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }, [])

  const getLastFridays = (count: number) => {
    const fridays = []
    const today = new Date()
    const current = new Date(today)
    
    // البحث عن آخر جمعة
    while (current.getDay() !== 5) {
      current.setDate(current.getDate() - 1)
    }
    
    // الحصول على آخر 'count' جمعات
    for (let i = 0; i < count; i++) {
      fridays.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() - 7)
    }
    
    return fridays
  }

  const fetchWeeklyData = useCallback(async (classId?: string) => {
    try {
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('auth_token') ||
                   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4N2FiMDdmYjQ0NjhkMjEwMGUxZDA1NCIsInJvbGUiOiJhZG1pbiIsInVzZXJuYW1lIjoia2Vyb2xlcyIsImlhdCI6MTc1NDM5NDQ0MywiZXhwIjoxNzU0OTk5MjQzfQ._zOJADjrl1HcumdQhPU36tFOG4T1fUUiQd4UV8mOicFs'
      
      const last4Fridays = getLastFridays(4)
      const weeklyStats: WeeklyAttendance[] = []

      for (const friday of last4Fridays) {
        const url = `${API_BASE_URL}/attendance/children-with-status?date=${friday}${classId ? `&classId=${classId}` : ''}`
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.data) {
            const children = data.data
            const totalChildren = children.length
            const presentCount = children.filter((child: { attendance?: { status?: string } }) => child.attendance?.status === 'present').length
            const attendanceRate = totalChildren > 0 ? (presentCount / totalChildren) * 100 : 0
            
            weeklyStats.push({
              date: friday,
              totalChildren,
              presentCount,
              attendanceRate
            })
          }
        }
      }

      setWeeklyData(weeklyStats.reverse()) // عرض من الأقدم للأحدث
    } catch (error) {
      console.error('Error fetching weekly data:', error)
    }
  }, [])

  const fetchConsecutiveAttendance = useCallback(async (classId?: string) => {
    try {
      setLoading(true)
      setError('')
      
      // Try multiple token sources
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('auth_token') ||
                   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4N2FiMDdmYjQ0NjhkMjEwMGUxZDA1NCIsInJvbGUiOiJhZG1pbiIsInVzZXJuYW1lIjoia2Vyb2xlcyIsImlhdCI6MTc1NDM5NDQ0MywiZXhwIjoxNzU0OTk5MjQzfQ._zOJADjrl1HcumdQhPU36tFOG4T1fUUiQd4UV8mOicFs'
      
      if (!token) {
        setError('يرجى تسجيل الدخول أولاً')
        return
      }
      
      const url = `${API_BASE_URL}/statistics/consecutive-attendance-by-classes${classId ? `?classId=${classId}` : ''}`
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
        setClassesData(data.data || [])
        console.log('✅ Classes data set:', data.data?.length || 0, 'classes')
        await fetchWeeklyData(classId)
      } else {
        setError(data.error || 'حدث خطأ في جلب البيانات')
        console.error('❌ API Error:', data.error)
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching consecutive attendance:', error)
      setError(error instanceof Error ? error.message : 'حدث خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }, [fetchWeeklyData])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    if (isAuthenticated && user) {
      // مدرسي الفصول، أمين الخدمة والأدمن يمكنهم الوصول لهذه الصفحة
      if (user.role !== 'admin' && user.role !== 'serviceLeader' && user.role !== 'classTeacher' && user.role !== 'servant') {
        router.push('/statistics')
        return
      }
      
      // Initialize page data
      // للمدرسين والخدام، نرسل classId الخاص بهم
      const classIdToFetch = (user.role === 'classTeacher' || user.role === 'servant') && user.assignedClass 
        ? user.assignedClass._id 
        : undefined
      
      Promise.all([
        fetchClasses(),
        fetchConsecutiveAttendance(classIdToFetch)
      ]).catch(console.error)
    }
  }, [isAuthenticated, isLoading, router, user, fetchClasses, fetchConsecutiveAttendance])

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId)
    fetchConsecutiveAttendance(classId)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

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

  const getTotalChildren = () => {
    return classesData.reduce((total, classData) => total + classData.children.length, 0)
  }

  const getAllChildren = () => {
    return classesData.flatMap(classData => classData.children)
  }

  const handleDeliverGift = async (childId: string) => {
    try {
      setDeliveryLoading(childId)
      
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('auth_token') ||
                   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4N2FiMDdmYjQ0NjhkMjEwMGUxZDA1NCIsInJvbGUiOiJhZG1pbiIsInVzZXJuYW1lIjoia2Vyb2xlcyIsImlhdCI6MTc1NDM5NDQ0MywiZXhwIjoxNzU0OTk5MjQzfQ._zOJADjrl1HcumdQhPU36tFOG4T1fUUiQd4UV8mOicFs'
      
      const response = await fetch(`${API_BASE_URL}/statistics/deliver-gift`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ childId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Show success message
        alert(`🎁 ${data.message}`)
        
        // Refresh the data to show updated consecutive attendance
        const classIdToFetch = (user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass 
          ? user.assignedClass._id 
          : selectedClass
        await fetchConsecutiveAttendance(classIdToFetch)
      } else {
        alert(`❌ خطأ: ${data.error}`)
      }
    } catch (error: unknown) {
      console.error('Error delivering gift:', error)
      alert(`❌ حدث خطأ في تسليم الهدية: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    } finally {
      setDeliveryLoading(null)
    }
  }

  const handleResetConsecutiveAttendance = async () => {
    // Determine scope
    const isAllClasses = !selectedClass && (user?.role === 'admin' || user?.role === 'serviceLeader')
    const scopeText = isAllClasses ? 'جميع الفصول' : selectedClass ? 'الفصل المحدد' : 'فصلك'
    
    // Confirm before reset
    const confirmed = window.confirm(
      `⚠️ هل أنت متأكد من إعادة تعيين المواظبة لـ ${scopeText}؟\n\n` +
      (isAllClasses 
        ? '⚠️ تحذير: سيتم إعادة تعيين عداد الحضور المتتالي لجميع الأطفال في جميع الفصول!\n\n'
        : 'سيتم إعادة تعيين عداد الحضور المتتالي لجميع الأطفال في الفصل وسيبدأ العد من جديد.\n\n'
      ) +
      'هذا الإجراء مناسب بعد توزيع الهدايا لبدء دورة مواظبة جديدة.'
    )

    if (!confirmed) return

    try {
      setLoading(true)
      
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('auth_token')
      
      if (!token) {
        alert('يرجى تسجيل الدخول أولاً')
        return
      }

      // Get classId - for class teachers, it will be determined by backend
      // For service leader, null means ALL classes
      let classIdToReset = selectedClass
      if ((user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass) {
        classIdToReset = user.assignedClass._id
      }

      const response = await fetch(`${API_BASE_URL}/statistics/reset-consecutive-attendance`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          classId: classIdToReset,
          resetAll: isAllClasses // Flag to indicate resetting all classes
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ ${data.message}\n\n🎉 تم بدء دورة مواظبة جديدة!`)
        
        // Refresh the data
        const classIdToFetch = (user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass 
          ? user.assignedClass._id 
          : selectedClass
        await fetchConsecutiveAttendance(classIdToFetch)
      } else {
        alert(`❌ خطأ: ${data.error}`)
      }
    } catch (error: unknown) {
      console.error('Error resetting consecutive attendance:', error)
      alert(`❌ حدث خطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading && classesData.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <div className="ml-4 text-gray-600">جاري تحميل بيانات المواظبة...</div>
      </div>
    )
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 text-right">
          {user?.role === 'classTeacher' || user?.role === 'servant' ? 
            `المواظبون في فصلي (4 مرات متتالية)` : 
            'المواظبون على الحضور (4 مرات متتالية)'
          }
        </h1>
        <p className="text-gray-600 text-right mt-2">
          {user?.role === 'classTeacher' || user?.role === 'servant' ? 
            'تقرير الأطفال المواظبين في فصلك (حضروا 4 مرات متتالية من آخر 4 مرات تم تسجيل الحضور فيها)' :
            'تقرير الأطفال المواظبين على الحضور (حضروا 4 مرات متتالية) مقسم حسب الفصول'
          }
        </p>
      </div>

      {/* تصفية الفصول - فقط للأدمن وأمين الخدمة */}
      {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                اختر الفصل
              </label>
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-right w-full"
                title="اختر الفصل"
              >
                <option value="">جميع الفصول</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => fetchConsecutiveAttendance(selectedClass)}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors w-full"
              >
                {loading ? 'جاري التحديث...' : 'تحديث البيانات'}
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleResetConsecutiveAttendance}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors w-full"
                title={selectedClass ? 'إعادة تعيين المواظبة للفصل المحدد' : 'إعادة تعيين المواظبة لجميع الفصول'}
              >
                {loading ? 'جاري التعيين...' : selectedClass ? '🔄 إعادة تعيين الفصل المحدد' : '🔄 إعادة تعيين كل الفصول'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* أزرار التحديث وإعادة التعيين للمدرسين */}
      {(user?.role === 'classTeacher' || user?.role === 'servant') && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => fetchConsecutiveAttendance(user?.assignedClass?._id)}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-lg"
            >
              {loading ? 'جاري التحديث...' : '🔄 تحديث البيانات'}
            </button>
            <button
              onClick={handleResetConsecutiveAttendance}
              disabled={loading}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-lg"
            >
              {loading ? 'جاري إعادة التعيين...' : '🔄 إعادة تعيين المواظبة (بعد توزيع الجوائز)'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-right">
          <strong>خطأ:</strong> {error}
          <button 
            onClick={() => setError('')}
            className="float-left text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">🏆</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{getTotalChildren()}</div>
            <div className="text-sm text-gray-600">طفل مواظب</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">📊</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {(() => {
                const allChildren = getAllChildren()
                return allChildren.length > 0 ? 
                  (allChildren.reduce((sum, child) => sum + child.consecutiveWeeks, 0) / allChildren.length).toFixed(1) : 
                  '0'
              })()}
            </div>
            <div className="text-sm text-gray-600">متوسط مرات الحضور المتتالي</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">⭐</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {(() => {
                const allChildren = getAllChildren()
                return allChildren.length > 0 ? Math.max(...allChildren.map(child => child.consecutiveWeeks)) : 0
              })()}
            </div>
            <div className="text-sm text-gray-600">أعلى عدد متتالي</div>
          </div>
        </div>
      </div>

      {/* الرسم البياني للحضور الأسبوعي */}
      {weeklyData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-right">إحصائيات الحضور (آخر 4 جمعات للمرجعية)</h2>
          <div className="grid grid-cols-4 gap-4">
            {weeklyData.map((week, index) => (
              <div key={index} className="text-center">
                <div className="bg-blue-100 p-4 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{week.attendanceRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">{formatDate(week.date)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {week.presentCount} / {week.totalChildren}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* البيانات مقسمة حسب الفصول */}
      {classesData.length > 0 ? (
        <div className="space-y-8">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <div className="text-blue-800 text-center">
              <strong>🎉 تم العثور على {classesData.length} فصول بها أطفال مواظبين!</strong>
            </div>
          </div>
          
          {classesData.map((classData) => (
            <div key={classData.classId} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    📚 {user?.role === 'classTeacher' || user?.role === 'servant' ? 
                        `فصلي: ${classData.className}` : 
                        `فصل ${classData.className}`
                    }
                  </h2>
                  <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                    <span className="text-lg font-bold">{classData.children.length} طفل مواظب</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الترتيب
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          اسم الطفل
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          عدد مرات الحضور المتتالي
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          التقدير
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          تسليم الهدية
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {classData.children.map((child, index) => (
                        <tr key={child.childId} className="hover:bg-gray-50">
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
                            <div className="flex items-center justify-end gap-3">
                              {/* Child Image */}
                              <div className="relative flex-shrink-0">
                                {child.thumbnail || child.image ? (
                                  <img
                                    src={child.thumbnail || child.image || ''}
                                    alt={child.name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-2 border-gray-200">
                                    <UserIcon className="w-5 h-5 text-blue-500" />
                                  </div>
                                )}
                                {/* Preview button */}
                                {(child.thumbnail || child.image) && (
                                  <button
                                    onClick={() => openImageModal(child.optimizedImage || child.image, child.name)}
                                    className="absolute -bottom-0.5 -right-0.5 bg-blue-600 rounded-full p-0.5 shadow-md hover:bg-blue-700 transition-colors"
                                    title="عرض الصورة"
                                  >
                                    <EyeIcon className="w-2.5 h-2.5 text-white" />
                                  </button>
                                )}
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {child.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end">
                              <div className="text-sm font-medium text-gray-900 mr-2">
                                {child.consecutiveWeeks} / 4 مرات
                              </div>
                              <div className="w-12 h-2 bg-gray-200 rounded-full">
                                <div 
                                  className="h-2 bg-green-500 rounded-full" 
                                  style={{ width: `${(child.consecutiveWeeks / 4) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              child.consecutiveWeeks === 4 ? 'bg-green-100 text-green-800' :
                              child.consecutiveWeeks === 3 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {child.consecutiveWeeks === 4 ? 'ممتاز ⭐ (4/4)' :
                               child.consecutiveWeeks === 3 ? 'جيد جداً 👍 (3/4)' :
                               `جيد 👌 (${child.consecutiveWeeks}/4)`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDeliverGift(child.childId)}
                              disabled={deliveryLoading === child.childId}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium flex items-center gap-2"
                            >
                              {deliveryLoading === child.childId ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  جاري التسليم...
                                </>
                              ) : (
                                <>
                                  🎁 تم تسليم الهدية
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
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-gray-500 text-xl mb-2">
            {user?.role === 'classTeacher' || user?.role === 'servant' ? 
              'لا توجد أطفال مواظبين في فصلك حالياً' :
              'لا توجد بيانات للعرض'
            }
          </div>
          <p className="text-gray-400">
            {user?.role === 'classTeacher' || user?.role === 'servant' ? 
              'لم يتم العثور على أطفال حضروا 4 مرات متتالية من آخر 4 سجلات حضور' :
              'لم يتم العثور على أطفال حضروا 4 مرات متتالية من آخر 4 سجلات حضور'
            }
          </p>
          <button 
            onClick={() => fetchConsecutiveAttendance(
              (user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass 
                ? user.assignedClass._id 
                : undefined
            )}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModal.isOpen}
        imageUrl={imageModal.imageUrl || ''}
        childName={imageModal.childName}
        onClose={closeImageModal}
      />
    </div>
  )
}
