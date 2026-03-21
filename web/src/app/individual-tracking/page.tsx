'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  ChartBarIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  TrophyIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ImageModal from '@/components/ImageModal'
import { childrenAPI, statisticsAPI } from '@/services/api'
import styles from './page.module.css'

interface Child {
  _id: string
  name: string
  classId: string
  className?: string
  phone?: string
  notes?: string
  // Image fields
  image?: string | null
  thumbnail?: string | null
  optimizedImage?: string | null
}

interface ChildStatistics {
  child: {
    _id: string
    name: string
    class: any
    parentName?: string
    phone?: string
    notes?: string
  }
  summary: {
    totalRecords: number
    presentCount: number
    absentCount: number
    attendanceRate: number
    currentStreak: number
    maxStreak: number
  }
  dates: {
    presentDates: string[]
    absentDates: string[]
  }
  recentActivity: Array<{
    date: string
    status: string
    dayName: string
  }>
  monthlyBreakdown: Array<{
    month: string
    monthName: string
    present: number
    absent: number
    total: number
    rate: string
  }>
}

export default function IndividualTrackingPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [childStats, setChildStats] = useState<ChildStatistics | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)

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
  const [activityFilter, setActivityFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    // التحقق من الصلاحيات - فقط أمين الخدمة ومدرس الفصل
    if (isAuthenticated && user) {
      if (user.role === 'serviceLeader' || user.role === 'classTeacher') {
        loadChildren()
      } else {
        toast.error('ليس لديك صلاحية للوصول لهذه الصفحة')
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  const loadChildren = async () => {
    setLoading(true)
    try {
      let childrenResponse
      
      if (user?.role === 'serviceLeader') {
        // أمين الخدمة يرى جميع الأطفال
        childrenResponse = await childrenAPI.getAllChildren()
      } else if (user?.role === 'classTeacher' && user?.assignedClass) {
        // مدرس الفصل يرى أطفال فصله فقط
        childrenResponse = await childrenAPI.getByClass(user.assignedClass._id)
      } else {
        childrenResponse = { success: true, data: [] }
      }

      if (childrenResponse.success) {
        setChildren(childrenResponse.data || [])
      } else {
        toast.error('فشل في تحميل بيانات الأطفال')
      }
    } catch (error) {
      console.error('Error loading children:', error)
      toast.error('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const loadChildStatistics = async (child: Child) => {
    setStatsLoading(true)
    setSelectedChild(child)
    setShowStatsModal(true)
    
    try {
      const result = await statisticsAPI.getChildStatistics(child._id)
      
      if (result.success) {
        setChildStats(result.data)
      } else {
        toast.error(result.error || 'فشل في تحميل إحصائيات الطفل')
      }
    } catch (error) {
      console.error('Error loading child statistics:', error)
      toast.error('حدث خطأ في تحميل الإحصائيات')
    } finally {
      setStatsLoading(false)
    }
  }

  const closeStatsModal = () => {
    setShowStatsModal(false)
    setSelectedChild(null)
    setChildStats(null)
    setActivityFilter('all')
  }

  // Open image modal
  const openImageModal = (imageUrl: string | null | undefined, childName: string) => {
    if (!imageUrl) return
    setImageModal({
      isOpen: true,
      imageUrl: imageUrl.replace('/upload/', '/upload/f_auto,q_auto/'),
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

  // Filter activities based on selected filter
  const getFilteredActivities = () => {
    if (!childStats?.recentActivity) return []
    
    if (activityFilter === 'all') {
      return childStats.recentActivity
    }
    
    return childStats.recentActivity.filter(activity => activity.status === activityFilter)
  }

  // Get activity statistics for quick filters
  const getActivityStats = () => {
    if (!childStats?.recentActivity) return { present: 0, absent: 0, late: 0, total: 0 }
    
    const activities = childStats.recentActivity
    return {
      present: activities.filter(a => a.status === 'present').length,
      absent: activities.filter(a => a.status === 'absent').length,
      late: activities.filter(a => a.status === 'late').length,
      total: activities.length
    }
  }

  // Group activities by month for better organization
  const getGroupedActivities = () => {
    const activities = getFilteredActivities()
    const grouped: { [key: string]: typeof activities } = {}
    
    activities.forEach(activity => {
      const date = new Date(activity.date)
      const monthKey = date.toLocaleDateString('ar-EG', { 
        year: 'numeric', 
        month: 'long' 
      })
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = []
      }
      grouped[monthKey].push(activity)
    })
    
    // Sort months in descending order (most recent first)
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(grouped[a][0].date)
      const dateB = new Date(grouped[b][0].date)
      return dateB.getTime() - dateA.getTime()
    })
    
    return sortedKeys.map(monthKey => ({
      month: monthKey,
      activities: grouped[monthKey].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    }))
  }

  // Filter children based on search
  const filteredChildren = children.filter(child => 
    child.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">جاري تحميل البيانات...</p>
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
                <span className="hidden sm:inline">المتابعة الفردية للأطفال</span>
                <span className="sm:hidden">المتابعة الفردية</span>
                {user?.assignedClass && (
                  <span className="text-blue-600 font-medium text-base"> - {user.assignedClass.name}</span>
                )}
              </h1>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 ml-1 sm:ml-2" />
              <span className="text-sm text-gray-600 whitespace-nowrap">
                {filteredChildren.length} طفل
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="البحث عن طفل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Children Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredChildren.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">لا توجد أطفال متاحين</p>
            </div>
          ) : (
            filteredChildren.map((child) => (
              <div key={child._id} className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${styles.childCard}`}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
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
                          className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 shadow-md hover:bg-blue-700 transition-colors"
                          title="عرض الصورة"
                        >
                          <EyeIcon className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{child.name}</h3>
                    </div>
                    <button
                      onClick={() => loadChildStatistics(child)}
                      className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm flex-shrink-0"
                      title="عرض الإحصائيات"
                    >
                      <ChartBarIcon className="w-4 h-4 ml-1" />
                      إحصائيات
                    </button>
                  </div>
                  
                  {child.phone && (
                    <p className="text-sm text-gray-600 mb-2">
                      📞 {child.phone}
                    </p>
                  )}
                  
                  {child.notes && (
                    <p className="text-sm text-gray-500 truncate">
                      📝 {child.notes}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Statistics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-screen overflow-y-auto ${styles.modalContent}`}>
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  {/* Child Image in Modal */}
                  <div className="relative flex-shrink-0">
                    {selectedChild && (selectedChild as any)?.child?.thumbnail || (selectedChild as any)?.child?.image ? (
                      <img
                        src={(selectedChild as any)?.child?.thumbnail || (selectedChild as any)?.child?.image || ''}
                        alt={selectedChild?.name || ''}
                        className="w-16 h-16 rounded-full object-cover border-3 border-blue-200 shadow-md"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-3 border-blue-200 shadow-md">
                        <UserIcon className="w-8 h-8 text-blue-500" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    إحصائيات {selectedChild?.name}
                  </h2>
                </div>
                <button
                  onClick={closeStatsModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  title="إغلاق"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {statsLoading ? (
                <div className="text-center py-12">
                  <LoadingSpinner size="lg" />
                  <p className="text-gray-600 mt-4">جاري تحميل الإحصائيات...</p>
                </div>
              ) : childStats ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`bg-green-50 p-4 rounded-lg ${styles.statsCard}`}>
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-8 h-8 text-green-600 ml-3" />
                        <div>
                          <p className="text-sm text-gray-600">أيام الحضور</p>
                          <p className="text-2xl font-bold text-green-700">
                            {childStats.summary.presentCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`bg-red-50 p-4 rounded-lg ${styles.statsCard}`}>
                      <div className="flex items-center">
                        <XCircleIcon className="w-8 h-8 text-red-600 ml-3" />
                        <div>
                          <p className="text-sm text-gray-600">أيام الغياب</p>
                          <p className="text-2xl font-bold text-red-700">
                            {childStats.summary.absentCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`bg-blue-50 p-4 rounded-lg ${styles.statsCard}`}>
                      <div className="flex items-center">
                        <ChartBarIcon className="w-8 h-8 text-blue-600 ml-3" />
                        <div>
                          <p className="text-sm text-gray-600">نسبة الحضور</p>
                          <p className="text-2xl font-bold text-blue-700">
                            {childStats.summary.attendanceRate}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`bg-yellow-50 p-4 rounded-lg ${styles.statsCard}`}>
                      <div className="flex items-center">
                        <TrophyIcon className="w-8 h-8 text-yellow-600 ml-3" />
                        <div>
                          <p className="text-sm text-gray-600">أطول مواظبة</p>
                          <p className="text-2xl font-bold text-yellow-700">
                            {childStats.summary.maxStreak} أسبوع
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Records Badge */}
                  <div className="text-center">
                    <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                      📋 إجمالي السجلات: {childStats.summary.totalRecords}
                    </span>
                  </div>

                  {/* Current Streak */}
                  {childStats.summary.currentStreak > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border-l-4 border-green-500">
                      <div className="flex items-center">
                        <TrophyIcon className="w-6 h-6 text-green-600 ml-2" />
                        <p className="text-lg font-semibold text-gray-800">
                          المواظبة الحالية: {childStats.summary.currentStreak} أسبوع متتالي 🎉
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  <div className="bg-white border rounded-lg">
                    <div className="p-4 border-b">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            <CalendarDaysIcon className="w-5 h-5 ml-2" />
                            سجل الحضور الكامل ({getFilteredActivities().length} من {childStats.recentActivity?.length || 0})
                          </h3>
                        </div>
                        
                        {/* Quick Filter Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setActivityFilter('all')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              activityFilter === 'all' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            جميع السجلات ({getActivityStats().total})
                          </button>
                          <button
                            onClick={() => setActivityFilter('present')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              activityFilter === 'present' 
                                ? 'bg-green-500 text-white' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            ✅ حضور ({getActivityStats().present})
                          </button>
                          <button
                            onClick={() => setActivityFilter('absent')}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              activityFilter === 'absent' 
                                ? 'bg-red-500 text-white' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            ❌ غياب ({getActivityStats().absent})
                          </button>
                          {getActivityStats().late > 0 && (
                            <button
                              onClick={() => setActivityFilter('late')}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                activityFilter === 'late' 
                                  ? 'bg-yellow-500 text-white' 
                                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              }`}
                            >
                              ⏰ تأخير ({getActivityStats().late})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      {getFilteredActivities().length > 0 ? (
                        <div className="space-y-6 max-h-96 overflow-y-auto">
                          {getGroupedActivities().map((monthGroup, monthIndex) => (
                            <div key={monthIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                              {/* Month Header */}
                              <div className="bg-gray-50 px-4 py-2 border-b">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-900">{monthGroup.month}</h4>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-green-600">
                                      ✅ {monthGroup.activities.filter(a => a.status === 'present').length}
                                    </span>
                                    <span className="text-red-600">
                                      ❌ {monthGroup.activities.filter(a => a.status === 'absent').length}
                                    </span>
                                    {monthGroup.activities.filter(a => a.status === 'late').length > 0 && (
                                      <span className="text-yellow-600">
                                        ⏰ {monthGroup.activities.filter(a => a.status === 'late').length}
                                      </span>
                                    )}
                                    <span className="text-gray-600 font-medium">
                                      المجموع: {monthGroup.activities.length}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Month Activities */}
                              <div className="divide-y divide-gray-100">
                                {monthGroup.activities.map((activity, index) => (
                                  <div key={index} className={`flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors ${
                                    activity.status === 'present' ? 'border-r-4 border-green-500' :
                                    activity.status === 'absent' ? 'border-r-4 border-red-500' :
                                    'border-r-4 border-yellow-500'
                                  }`}>
                                    <div className="flex items-center">
                                      {activity.status === 'present' ? (
                                        <CheckCircleIcon className="w-5 h-5 text-green-600 ml-3" />
                                      ) : activity.status === 'absent' ? (
                                        <XCircleIcon className="w-5 h-5 text-red-600 ml-3" />
                                      ) : (
                                        <ClockIcon className="w-5 h-5 text-yellow-600 ml-3" />
                                      )}
                                      <div>
                                        <span className="text-sm font-medium block">
                                          {activity.status === 'present' ? '✅ حضر' : 
                                           activity.status === 'absent' ? '❌ غاب' : '⏰ متأخر'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(activity.date).toLocaleDateString('ar-EG', {
                                            weekday: 'long'
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-600 text-left">
                                      <div className="font-medium">
                                        {new Date(activity.date).toLocaleDateString('ar-EG', {
                                          day: 'numeric',
                                          month: 'short'
                                        })}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {new Date(activity.date).toLocaleDateString('ar-EG', {
                                          year: 'numeric'
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarDaysIcon className="w-8 h-8 text-gray-400" />
                          </div>
                          {activityFilter === 'all' ? (
                            <>
                              <p className="text-gray-500 font-medium">لا توجد سجلات حضور</p>
                              <p className="text-gray-400 text-sm">ستظهر سجلات الحضور هنا عند تسجيلها</p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-500 font-medium">
                                لا توجد سجلات للفلتر المحدد
                              </p>
                              <p className="text-gray-400 text-sm">
                                {activityFilter === 'present' && 'لا توجد سجلات حضور'}
                                {activityFilter === 'absent' && 'لا توجد سجلات غياب'}
                                {activityFilter === 'late' && 'لا توجد سجلات تأخير'}
                              </p>
                              <button
                                onClick={() => setActivityFilter('all')}
                                className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                              >
                                عرض جميع السجلات
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monthly Breakdown */}
                  {childStats.monthlyBreakdown && childStats.monthlyBreakdown.length > 0 && (
                    <div className="bg-white border rounded-lg">
                      <div className="p-4 border-b">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <ChartBarIcon className="w-5 h-5 ml-2" />
                          الإحصائيات الشهرية
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {childStats.monthlyBreakdown.map((month, index) => (
                            <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border">
                              <h4 className="font-bold text-gray-900 mb-3 text-center">{month.monthName}</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">حضر:</span>
                                  <div className="flex items-center">
                                    <span className="text-green-600 font-bold text-lg ml-1">{month.present}</span>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">غاب:</span>
                                  <div className="flex items-center">
                                    <span className="text-red-600 font-bold text-lg ml-1">{month.absent}</span>
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                  </div>
                                </div>
                                <div className="border-t pt-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">النسبة:</span>
                                    <span className={`font-bold text-lg ${
                                      parseFloat(month.rate) >= 80 ? 'text-green-600' :
                                      parseFloat(month.rate) >= 60 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {month.rate}%
                                    </span>
                                  </div>
                                  {/* Progress Bar */}
                                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-300 ${styles.progressBar} ${
                                        parseFloat(month.rate) >= 80 ? 'bg-green-500' :
                                        parseFloat(month.rate) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      data-width={Math.round(parseFloat(month.rate))}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Child Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">معلومات الطفل</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">الاسم:</span> {childStats.child.name}
                      </div>
                      {childStats.child.class && (
                        <div>
                          <span className="font-medium">الفصل:</span> {childStats.child.class.name}
                        </div>
                      )}
                      {childStats.child.parentName && (
                        <div>
                          <span className="font-medium">ولي الأمر:</span> {childStats.child.parentName}
                        </div>
                      )}
                      {childStats.child.phone && (
                        <div>
                          <span className="font-medium">الهاتف:</span> {childStats.child.phone}
                        </div>
                      )}
                      {childStats.child.notes && (
                        <div className="md:col-span-2">
                          <span className="font-medium">ملاحظات:</span> {childStats.child.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">فشل في تحميل الإحصائيات</p>
                  <button
                    onClick={() => selectedChild && loadChildStatistics(selectedChild)}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModal.isOpen}
        imageUrl={imageModal.imageUrl || ''}
        alt={imageModal.childName}
        onClose={closeImageModal}
      />
    </div>
  )
}
