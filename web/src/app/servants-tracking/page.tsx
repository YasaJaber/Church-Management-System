'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import PageBackButton from '@/components/ui/PageBackButton'
import { 
  CheckCircleIcon, 
  XCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  UserIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { servantsAPI } from '@/services/api'

interface Servant {
  _id: string
  name: string
  phone?: string
  role?: string
  classesAssigned?: string[]
  createdAt: string
}

interface ServantStatistics {
  servant: {
    _id: string
    name: string
    phone?: string
    username?: string
    createdAt?: string
  }
  summary: {
    totalRecords: number
    presentCount: number
    absentCount: number
    lateCount: number
    attendanceRate: number
    currentStreak: number
    currentStreakType?: string
    maxPresentStreak: number
    maxAbsentStreak: number
  }
  dates: {
    presentDates: string[]
    absentDates: string[]
    lateDates?: string[]
  }
  recentActivity: Array<{
    date: string
    status: string
    dayName: string
    notes?: string
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

interface ServantNeedingFollowUp {
  _id: string
  name: string
  phone?: string
  consecutiveAbsences: number
  lastPresentDate?: string
}

export default function ServantsTrackingPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [servants, setServants] = useState<Servant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedServant, setSelectedServant] = useState<Servant | null>(null)
  const [servantStats, setServantStats] = useState<ServantStatistics | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [activityFilter, setActivityFilter] = useState<'all' | 'present' | 'absent'>('all')

  // إدارة الافتقاد
  const [servantsNeedingFollowUp, setServantsNeedingFollowUp] = useState<ServantNeedingFollowUp[]>([])
  const [showFollowUpSection, setShowFollowUpSection] = useState(false)
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [generalStats, setGeneralStats] = useState<any>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    // التحقق من الصلاحيات - فقط أمين الخدمة والادمن
    if (isAuthenticated && user) {
      if (user.role === 'serviceLeader' || user.role === 'admin') {
        loadServants()
      } else {
        toast.error('ليس لديك صلاحية للوصول لهذه الصفحة')
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  const loadServants = async () => {
    setLoading(true)
    try {
      const servantsResponse = await servantsAPI.getAll()
      if (servantsResponse.success && servantsResponse.data) {
        setServants(servantsResponse.data)
      } else {
        toast.error('فشل في تحميل بيانات الخدام')
        setServants([])
      }
      
      // Load general statistics including follow-up count
      await loadGeneralStatistics()
    } catch (error) {
      console.error('Error loading servants:', error)
      toast.error('حدث خطأ في تحميل بيانات الخدام')
      setServants([])
    } finally {
      setLoading(false)
    }
  }

  const loadGeneralStatistics = async () => {
    try {
      const response = await servantsAPI.getGeneralStatistics()
      if (response.success) {
        setGeneralStats(response.data)
      }
    } catch (error) {
      console.error('Error loading general statistics:', error)
    }
  }

  const loadFollowUpList = async () => {
    setFollowUpLoading(true)
    try {
      const response = await servantsAPI.getFollowUpList()
      if (response.success && response.data) {
        setServantsNeedingFollowUp(response.data)
        toast.success(`تم العثور على ${response.data.length} خادم يحتاج للمتابعة`)
      } else {
        toast.error('فشل في تحميل قائمة الافتقاد')
        setServantsNeedingFollowUp([])
      }
    } catch (error) {
      console.error('Error loading follow-up list:', error)
      toast.error('حدث خطأ في تحميل قائمة الافتقاد')
      setServantsNeedingFollowUp([])
    } finally {
      setFollowUpLoading(false)
    }
  }

  const loadServantStatistics = async (servant: Servant) => {
    setStatsLoading(true)
    try {
      const response = await servantsAPI.getIndividualStatistics(servant._id)
      if (response.success) {
        setServantStats(response.data)
      } else {
        toast.error('فشل في تحميل إحصائيات الخادم')
      }
    } catch (error) {
      console.error('Error loading servant statistics:', error)
      toast.error('حدث خطأ في تحميل إحصائيات الخادم')
    } finally {
      setStatsLoading(false)
    }
  }

  const openStatsModal = (servant: Servant) => {
    setSelectedServant(servant)
    setShowStatsModal(true)
    loadServantStatistics(servant)
  }

  const closeStatsModal = () => {
    setShowStatsModal(false)
    setSelectedServant(null)
    setServantStats(null)
  }

  const filteredServants = servants.filter(servant => {
    const matchesSearch = servant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (servant.phone && servant.phone.includes(searchTerm)) ||
      (servant.role && servant.role.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesSearch
  })

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1">
              <PageBackButton className="ml-4" />
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                <span className="hidden sm:inline">إحصائيات ومتابعة الخدام</span>
                <span className="sm:hidden">متابعة الخدام</span>
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 space-x-reverse">
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
        {/* General Statistics */}
        {generalStats && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">الإحصائيات العامة</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{generalStats.totalServants}</div>
                <div className="text-sm text-gray-600">إجمالي الخدام</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{generalStats.presentToday}</div>
                <div className="text-sm text-gray-600">حاضرون اليوم</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{generalStats.attendanceRate}%</div>
                <div className="text-sm text-gray-600">نسبة الحضور العامة</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{generalStats.servantsNeedingFollowUp}</div>
                <div className="text-sm text-gray-600">يحتاجون متابعة</div>
              </div>
            </div>
          </div>
        )}

        {/* قسم الافتقاد */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">قائمة الافتقاد</h2>
            <button
              onClick={() => {
                setShowFollowUpSection(!showFollowUpSection)
                if (!showFollowUpSection) {
                  loadFollowUpList()
                }
              }}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                showFollowUpSection 
                  ? 'bg-red-600 text-white' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <ExclamationTriangleIcon className="w-5 h-5" />
              {showFollowUpSection ? 'إخفاء الافتقاد' : 'عرض الافتقاد'}
              {generalStats?.servantsNeedingFollowUp > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  showFollowUpSection ? 'bg-red-800 text-red-100' : 'bg-red-600 text-white'
                }`}>
                  {generalStats.servantsNeedingFollowUp}
                </span>
              )}
            </button>
          </div>

          {showFollowUpSection && (
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
              <div className="mb-4 p-3 bg-red-100 rounded-lg border border-red-300">
                <p className="text-red-800 text-sm">
                  <strong>معايير الافتقاد:</strong> الخدام الذين لديهم 3 غيابات متتالية أو أكثر في أيام الجمعة
                </p>
              </div>
              
              {followUpLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : servantsNeedingFollowUp.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-green-900 mb-2">لا يوجد خدام يحتاجون للمتابعة</h3>
                  <p className="text-green-700">جميع الخدام يحافظون على حضورهم المنتظم</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {servantsNeedingFollowUp.map((servant: ServantNeedingFollowUp) => (
                    <div key={servant._id} className="bg-white rounded-lg border-2 border-red-300 p-4 shadow-md">
                      <div className="flex items-center mb-3">
                        <div className="p-2 rounded-full bg-red-100 ml-3">
                          <UserIcon className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1 text-right">
                          <h3 className="text-lg font-semibold text-gray-900">{servant.name}</h3>
                          <p className="text-red-600 text-sm font-medium">
                            {servant.consecutiveAbsences} غيابات متتالية
                          </p>
                        </div>
                      </div>
                      
                      {servant.phone && (
                        <div className="mb-3">
                          <a 
                            href={`tel:${servant.phone}`}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <PhoneIcon className="w-4 h-4" />
                            <span className="text-sm">{servant.phone}</span>
                          </a>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <a 
                          href={`tel:${servant.phone || ''}`}
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
                        >
                          اتصال
                        </a>
                        <a 
                          href={`sms:${servant.phone || ''}`}
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm"
                        >
                          رسالة
                        </a>
                      </div>
                      
                      {servant.lastPresentDate && (
                        <div className="mt-2 text-xs text-gray-500 text-center">
                          آخر حضور: {new Date(servant.lastPresentDate).toLocaleDateString('ar-EG')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="البحث عن خادم..."
              className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg text-right"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Servants List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 mt-4">جاري تحميل قائمة الخدام...</p>
            </div>
          </div>
        ) : filteredServants.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center text-gray-500">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد خدام مطابقة للبحث</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                قائمة الخدام - اضغط على الاسم لعرض الإحصائيات
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {filteredServants.map((servant) => (
                <div
                  key={servant._id}
                  onClick={() => openStatsModal(servant)}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
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
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      عرض الإحصائيات
                    </span>
                    
                    {/* أيقونة الإحصائيات */}
                    <div className="text-blue-600">
                      <ChartBarIcon className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Statistics Modal */}
      {showStatsModal && selectedServant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                إحصائيات الخادم: {selectedServant.name}
              </h2>
              <button
                onClick={closeStatsModal}
                className="text-gray-400 hover:text-gray-600"
                title="إغلاق"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {statsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : servantStats ? (
                <div className="space-y-6">
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {servantStats.summary.presentCount}
                      </div>
                      <div className="text-sm text-gray-600">أيام الحضور</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {servantStats.summary.absentCount}
                      </div>
                      <div className="text-sm text-gray-600">أيام الغياب</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {servantStats.summary.attendanceRate}%
                      </div>
                      <div className="text-sm text-gray-600">نسبة الحضور</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {servantStats.summary.totalRecords}
                      </div>
                      <div className="text-sm text-gray-600">إجمالي السجلات</div>
                    </div>
                  </div>

                  {/* Current Streak Info */}
                  {servantStats.summary.currentStreak > 0 && (
                    <div className={`p-4 rounded-lg border-l-4 ${
                      servantStats.summary.currentStreakType === 'present' 
                        ? 'bg-green-50 border-green-500' 
                        : 'bg-red-50 border-red-500'
                    }`}>
                      <div className="flex items-center">
                        <div className={`text-lg font-semibold ${
                          servantStats.summary.currentStreakType === 'present' 
                            ? 'text-green-800' 
                            : 'text-red-800'
                        }`}>
                          {servantStats.summary.currentStreakType === 'present' 
                            ? `🔥 مواظبة حالية: ${servantStats.summary.currentStreak} أسبوع متتالي` 
                            : `⚠️ غياب حالي: ${servantStats.summary.currentStreak} أسبوع متتالي`
                          }
                        </div>
                      </div>
                      {servantStats.summary.maxPresentStreak > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          أطول مواظبة: {servantStats.summary.maxPresentStreak} أسبوع
                        </div>
                      )}
                    </div>
                  )}

                  {/* Monthly Breakdown */}
                  {servantStats.monthlyBreakdown && servantStats.monthlyBreakdown.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">الإحصائيات الشهرية</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الشهر
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                حاضر
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                غائب
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                المجموع
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                النسبة
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {servantStats.monthlyBreakdown.map((month) => (
                              <tr key={month.month}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {month.monthName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                  {month.present}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                  {month.absent}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {month.total}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                                  {month.rate}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  {servantStats.recentActivity && servantStats.recentActivity.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">النشاط الأخير</h3>
                      <div className="space-y-2">
                        {servantStats.recentActivity.slice(0, 10).map((activity, index) => (
                          <div key={index} className="py-2 px-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full ml-3 ${
                                  activity.status === 'present' ? 'bg-green-500' : 
                                  activity.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                                <span className="text-sm text-gray-900">
                                  {activity.dayName} - {new Date(activity.date).toLocaleDateString('ar-EG')}
                                </span>
                              </div>
                              <span className={`text-sm font-medium ${
                                activity.status === 'present' ? 'text-green-600' : 
                                activity.status === 'late' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {activity.status === 'present' ? 'حاضر' : 
                                 activity.status === 'late' ? 'متأخر' : 'غائب'}
                              </span>
                            </div>
                            {activity.notes && (
                              <div className="mt-2 text-xs text-gray-500 pr-6">
                                📝 {activity.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">لا توجد إحصائيات متاحة لهذا الخادم</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
