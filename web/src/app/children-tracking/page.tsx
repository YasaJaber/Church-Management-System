'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { childrenAPI, statisticsAPI } from '@/services/api'
import { 
  PhoneIcon, 
  UserIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Child {
  _id: string
  name: string
  phone?: string
  parentName?: string
  totalAttendance: number
  presentCount: number
  absentCount: number
  attendanceRate: number
  consecutiveAbsences: number
  needsFollowUp: boolean
}

interface ClassStats {
  class: {
    _id: string
    name: string
    stage: string
    grade: string
  }
  totalChildren: number
  children: Child[]
  childrenNeedingFollowUp: number
  message?: string
}

interface IndividualStats {
  child: {
    _id: string
    name: string
    phone?: string
    parentName?: string
    class: {
      name: string
      stage: string
      grade: string
    }
    createdAt: string
  }
  summary: {
    totalRecords: number
    presentCount: number
    absentCount: number
    lateCount?: number
    attendanceRate: number
    currentStreak: number
    currentStreakType?: string
    maxPresentStreak?: number
    maxAbsentStreak?: number
    maxStreak?: number
    recentAttendanceRate?: number
    lastAttendance?: string
  }
  dates?: {
    presentDates: string[]
    absentDates: string[]
    lateDates: string[]
  }
  recentActivity?: Array<{
    date: string
    status: string
    dayName: string
    notes: string
  }>
  recentAttendance?: Array<{
    date: string
    status: string
    notes: string
  }>
  monthlyBreakdown?: Array<{
    month: string
    monthName: string
    present: number
    absent: number
    total: number
    rate: string
  }>
}

export default function ChildrenTrackingPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [classStats, setClassStats] = useState<ClassStats[]>([])
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set())
  const [selectedChild, setSelectedChild] = useState<IndividualStats | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterNeedsFollowUp, setFilterNeedsFollowUp] = useState(false)

  console.log('🔐 Current user:', user)
  console.log('🔐 User role:', user?.role)

  useEffect(() => {
    console.log('🔄 ChildrenTracking component mounted, fetching data...')
    if (user) {
      fetchClassStatistics()
    } else {
      console.log('⚠️ No user found, cannot fetch data')
      setLoading(false)
    }
  }, [user])

  const fetchClassStatistics = async () => {
    try {
      console.log('🔄 Starting to fetch class statistics...')
      setLoading(true)
      const response = await childrenAPI.getStatisticsByClass()
      
      console.log('🔍 API Response:', response)
      
      if (response.success) {
        setClassStats(response.data)
        console.log('📊 Class statistics loaded:', response.data.length, 'classes')
        console.log('📊 First class:', response.data[0])
        console.log('📊 Total children across all classes:', response.data.reduce((sum: number, cls: ClassStats) => sum + cls.totalChildren, 0))
      } else {
        console.error('❌ Failed to fetch class statistics:', response.error)
        setClassStats([])
      }
    } catch (error) {
      console.error('❌ Error fetching class statistics:', error)
      setClassStats([])
    } finally {
      setLoading(false)
      console.log('✅ Finished fetching class statistics')
    }
  }

  const fetchIndividualStatistics = async (childId: string) => {
    try {
      console.log('🔄 Fetching individual statistics for child:', childId)
      // Use the same API endpoint that works for service leader dashboard
      const response = await statisticsAPI.getChildStatistics(childId)
      
      if (response.success) {
        console.log('📊 Individual statistics response:', response.data)
        console.log('📊 Recent activity length:', response.data.recentActivity?.length || 0)
        console.log('📊 Recent activity sample:', response.data.recentActivity?.slice(0, 2) || [])
        setSelectedChild(response.data)
        setShowModal(true)
        console.log('📊 Individual statistics loaded for child:', childId)
      } else {
        console.error('❌ Failed to fetch individual statistics:', response.error)
      }
    } catch (error) {
      console.error('❌ Error fetching individual statistics:', error)
    }
  }

  const toggleClassExpansion = (classId: string) => {
    const newExpanded = new Set(expandedClasses)
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId)
    } else {
      newExpanded.add(classId)
    }
    setExpandedClasses(newExpanded)
  }

  const makePhoneCall = (phone: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self')
    }
  }

  const getAttendanceStatusColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-100'
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getStreakColor = (type: string) => {
    return type === 'present' ? 'text-green-600' : 'text-red-600'
  }

  const filteredClasses = classStats.map(classItem => ({
    ...classItem,
    children: classItem.children.filter(child => {
      const matchesSearch = child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (child.parentName && child.parentName.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesFilter = !filterNeedsFollowUp || child.needsFollowUp
      
      return matchesSearch && matchesFilter
    })
  }))
  
  // Show all classes, even if empty after filtering
  const displayClasses = filteredClasses.length > 0 ? filteredClasses : classStats

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">يجب تسجيل الدخول أولاً</h2>
          <p className="text-gray-600 mb-6">للوصول لصفحة المتابعة الفردية، يجب تسجيل الدخول بحساب أمين خدمة أو مدير</p>
          <a 
            href="/login" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            تسجيل الدخول
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 text-right mb-2">
          المتابعة الفردية للأطفال
        </h1>
        <p className="text-gray-600 text-right">
          متابعة أداء وحضور الأطفال مقسمة حسب الفصول مع إمكانية المتابعة الفردية التفصيلية
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              البحث في الأطفال
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو اسم ولي الأمر..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>
          
          <div className="flex items-end">
            <label className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                checked={filterNeedsFollowUp}
                onChange={(e) => setFilterNeedsFollowUp(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                عرض الأطفال المحتاجين للمتابعة فقط
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center ml-4">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الفصول</p>
              <p className="text-2xl font-bold text-gray-900">{classStats.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center ml-4">
              <UserIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الأطفال</p>
              <p className="text-2xl font-bold text-gray-900">
                {classStats.reduce((sum, cls) => sum + cls.totalChildren, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center ml-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">يحتاجون متابعة</p>
              <p className="text-2xl font-bold text-gray-900">
                {classStats.reduce((sum, cls) => sum + (cls.childrenNeedingFollowUp || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center ml-4">
              <ChartBarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">معدل الحضور العام</p>
              <p className="text-2xl font-bold text-gray-900">
                {(() => {
                  const totalAttendance = classStats.reduce((sum, cls) => 
                    sum + cls.children.reduce((childSum, child) => childSum + child.totalAttendance, 0), 0
                  )
                  const totalPresent = classStats.reduce((sum, cls) => 
                    sum + cls.children.reduce((childSum, child) => childSum + child.presentCount, 0), 0
                  )
                  return totalAttendance > 0 ? Math.round((totalPresent / totalAttendance) * 100) : 0
                })()}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="space-y-6">
        {displayClasses.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <p className="text-gray-500 text-lg">لا توجد فصول للعرض</p>
          </div>
        ) : (
          displayClasses.map((classItem) => (
          <div key={classItem.class._id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Class Header */}
            <div 
              className="p-6 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleClassExpansion(classItem.class._id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{classItem.class.name}</h3>
                    <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
                      <span>{classItem.totalChildren} طفل</span>
                      {classItem.childrenNeedingFollowUp > 0 && (
                        <span className="flex items-center space-x-1 space-x-reverse text-red-600">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          <span>{classItem.childrenNeedingFollowUp || 0} يحتاج متابعة</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-left">
                  <div className="text-2xl font-bold text-gray-900">
                    {classItem.children.length > 0 
                      ? (() => {
                          const totalAttendance = classItem.children.reduce((sum, child) => sum + child.totalAttendance, 0)
                          const totalPresent = classItem.children.reduce((sum, child) => sum + child.presentCount, 0)
                          return totalAttendance > 0 ? Math.round((totalPresent / totalAttendance) * 100) : 0
                        })()
                      : 0
                    }%
                  </div>
                  <div className="text-sm text-gray-600">معدل الحضور</div>
                </div>
              </div>
            </div>

            {/* Children List */}
            {expandedClasses.has(classItem.class._id) && (
              <div className="p-6">
                {classItem.children.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {classItem.totalChildren === 0 
                      ? classItem.message 
                      : "لا يوجد أطفال يطابقون معايير البحث"
                    }
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classItem.children.map((child) => (
                      <div key={child._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{child.name}</h4>
                            {child.parentName && (
                              <p className="text-sm text-gray-600 mb-1">ولي الأمر: {child.parentName}</p>
                            )}
                          </div>
                          
                          {child.needsFollowUp && (
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                          )}
                        </div>

                        {/* Attendance Stats */}
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">الحضور:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAttendanceStatusColor(child.attendanceRate)}`}>
                              {child.attendanceRate.toFixed(1)}%
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">إجمالي الحضور:</span>
                            <span className="font-medium">{child.presentCount}/{child.totalAttendance}</span>
                          </div>
                          
                          {child.consecutiveAbsences > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">غياب متتالي:</span>
                              <span className="text-red-600 font-medium">{child.consecutiveAbsences} جمعة</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2 space-x-reverse">
                          <button
                            onClick={() => fetchIndividualStatistics(child._id)}
                            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1 space-x-reverse"
                          >
                            <ChartBarIcon className="w-4 h-4" />
                            <span>التفاصيل</span>
                          </button>
                          
                          {child.phone && (
                            <button
                              onClick={() => makePhoneCall(child.phone!)}
                              className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                              title="اتصال"
                            >
                              <PhoneIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
        )}
      </div>

      {/* Individual Statistics Modal */}
      {showModal && selectedChild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedChild.child.name}</h2>
                  <p className="text-gray-600">
                    {selectedChild.child.class.name} • 
                    {selectedChild.child.parentName && ` ولي الأمر: ${selectedChild.child.parentName}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="إغلاق"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {selectedChild.summary.totalRecords}
                    </div>
                    <div className="text-sm text-blue-700">إجمالي السجلات</div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {selectedChild.summary.presentCount}
                    </div>
                    <div className="text-sm text-green-700">أيام الحضور</div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {selectedChild.summary.absentCount}
                    </div>
                    <div className="text-sm text-red-700">أيام الغياب</div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {selectedChild.summary.attendanceRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-purple-700">معدل الحضور</div>
                  </div>
                </div>
              </div>

              {/* Streak Information */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">إحصائيات المواظبة</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-xl font-bold mb-1 ${getStreakColor(selectedChild.summary.currentStreakType || 'present')}`}>
                      {selectedChild.summary.currentStreak}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedChild.summary.currentStreakType === 'present' ? 'حضور متتالي' : 'غياب متتالي'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600 mb-1">
                      {selectedChild.summary.maxPresentStreak}
                    </div>
                    <div className="text-sm text-gray-600">أقصى حضور متتالي</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600 mb-1">
                      {selectedChild.summary.maxAbsentStreak}
                    </div>
                    <div className="text-sm text-gray-600">أقصى غياب متتالي</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">النشاط الأخير</h3>
                <div className="space-y-2">
                  {selectedChild.recentAttendance && selectedChild.recentAttendance.length > 0 ? (
                    selectedChild.recentAttendance.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            activity.status === 'present' ? 'bg-green-100' : 
                            activity.status === 'absent' ? 'bg-red-100' : 'bg-yellow-100'
                          }`}>
                            {activity.status === 'present' ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            ) : activity.status === 'absent' ? (
                              <XCircleIcon className="w-4 h-4 text-red-600" />
                            ) : (
                              <ClockIcon className="w-4 h-4 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {activity.status === 'present' ? 'حاضر' : 
                               activity.status === 'absent' ? 'غائب' : 'متأخر'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(activity.date + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long' })}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 text-left">
                          <div className="font-medium">
                            {new Date(activity.date + 'T00:00:00').toLocaleDateString('ar-EG', {
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
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="mb-4">
                        <ClockIcon className="w-16 h-16 text-gray-300 mx-auto" />
                      </div>
                      <p className="text-lg font-medium mb-2">لا توجد سجلات حضور</p>
                      <p className="text-sm">ستظهر سجلات الحضور هنا عند تسجيلها</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Breakdown */}
              {selectedChild.monthlyBreakdown && selectedChild.monthlyBreakdown.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">الإحصائيات الشهرية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedChild.monthlyBreakdown.map((month) => (
                      <div key={month.month} className="border border-gray-200 rounded-lg p-4">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 mb-2">{month.monthName}</div>
                          <div className="text-sm text-gray-600 mb-2">
                            {month.present}/{month.total} حضور
                          </div>
                          <div className={`text-lg font-bold ${getAttendanceStatusColor(parseFloat(month.rate))}`}>
                            {month.rate}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
