'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { attendanceAPI, childrenAPI, classesAPI, API_BASE_URL } from '@/services/api'

interface AttendanceStats {
  totalChildren: number
  presentToday: number
  absentToday: number
  attendanceRate: number
  weeklyStats?: any[]
  consecutiveAbsent?: any[]
  topAttendees?: any[]
  churchStats?: any
}

interface ClassStats {
  className: string
  totalChildren: number
  presentToday: number
  attendanceRate: number
}

interface WeeklyData {
  date: string
  present: number
  total: number
  rate: number
}

export default function StatisticsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [stats, setStats] = useState<AttendanceStats>({
    totalChildren: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    weeklyStats: [],
    consecutiveAbsent: [],
    topAttendees: [],
    churchStats: null
  })
  const [classStats, setClassStats] = useState<ClassStats[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('') // Will be set to most recent attendance date
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [selectedClass, setSelectedClass] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    if (isAuthenticated && user) {
      // إذا كان المستخدم مدرس فصل أو خادم، يجب أن يرى فصله فقط
      if ((user.role === 'classTeacher' || user.role === 'servant') && user.assignedClass) {
        setSelectedClass(user.assignedClass._id)
      }
      
      // Get most recent attendance date and initialize the page
      initializePage()
    }
  }, [isAuthenticated, isLoading, router, user])

  const initializePage = async () => {
    try {
      // Get most recent attendance date
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      const response = await fetch(`${API_BASE_URL}/attendance/recent-dates?limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      let dateToUse = new Date().toISOString().split('T')[0] // Default to today
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data && data.data.length > 0) {
          dateToUse = data.data[0]
          console.log('Using most recent attendance date:', dateToUse)
        } else {
          console.log('No attendance data found, using today\'s date')
        }
      } else {
        console.log('Failed to fetch recent dates, using today\'s date')
      }
      
      setSelectedDate(dateToUse)
    } catch (error) {
      console.error('Error initializing page:', error)
      // Fallback to today's date
      setSelectedDate(new Date().toISOString().split('T')[0])
    }
  }

  useEffect(() => {
    if (isAuthenticated && selectedDate) {
      fetchStatistics()
    }
  }, [selectedDate, selectedClass])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      console.log('Fetching comprehensive statistics for date:', selectedDate)
      console.log('User role:', user?.role, 'Selected class:', selectedClass)
      
      // تحديد الفصل المناسب حسب الصلاحيات
      let targetClassId = selectedClass
      if ((user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass) {
        // مدرسي الفصول والخدام يرون فصلهم فقط
        targetClassId = user.assignedClass._id
        console.log('🔒 Restricted to user class:', targetClassId)
      }
      
      // Get basic children with attendance status for selected date
      const childrenWithStatusResponse = await attendanceAPI.getChildrenWithStatus(selectedDate, targetClassId)
      
      if (childrenWithStatusResponse.success && childrenWithStatusResponse.data) {
        const childrenData = childrenWithStatusResponse.data
        const totalChildren = childrenData.length
        const presentToday = childrenData.filter((child: any) => child.attendance?.status === 'present').length
        const absentToday = childrenData.filter((child: any) => child.attendance?.status === 'absent').length
        const attendanceRate = totalChildren > 0 ? (presentToday / totalChildren) * 100 : 0

        // أمين الخدمة والأدمن يقدروا يشوفوا الإحصائيات المتقدمة
        let weeklyStats: any[] = []
        let consecutiveData = { data: [] }
        let churchData = { data: null }
        
        if (user?.role === 'admin' || user?.role === 'serviceLeader') {
          // Get weekly attendance statistics (last 4 weeks)
          weeklyStats = await fetchWeeklyStats(targetClassId)
          
          // Get consecutive absent children
          try {
            const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
            const consecutiveResponse = await fetch(`${API_BASE_URL}/statistics/consecutive-attendance${targetClassId ? `?classId=${targetClassId}` : ''}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            consecutiveData = consecutiveResponse.ok ? await consecutiveResponse.json() : { data: [] }
          } catch (error) {
            console.error('Error fetching consecutive data:', error)
          }

          // Get church overall statistics (for admin/serviceLeader only)
          try {
            const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
            const churchResponse = await fetch(`${API_BASE_URL}/statistics/church`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            churchData = churchResponse.ok ? await churchResponse.json() : { data: null }
          } catch (error) {
            console.error('Error fetching church data:', error)
          }
        }

        console.log('Statistics calculated:', { totalChildren, presentToday, absentToday, attendanceRate })

        setStats({
          totalChildren,
          presentToday,
          absentToday,
          attendanceRate,
          weeklyStats: weeklyStats,
          consecutiveAbsent: consecutiveData.data || [],
          topAttendees: [],
          churchStats: churchData.data
        })

        // Calculate class statistics (only for admin/serviceLeader)
        if (user?.role === 'admin' || user?.role === 'serviceLeader') {
          await calculateClassStatistics(childrenData)
        } else {
          // مدرسي الفصول يشوفوا إحصائيات فصلهم فقط
          setClassStats([{
            className: user?.assignedClass?.name || 'فصلي',
            totalChildren,
            presentToday,
            attendanceRate
          }])
        }
      } else {
        console.error('Failed to fetch children with status:', childrenWithStatusResponse)
      }

    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklyStats = async (classId?: string): Promise<WeeklyData[]> => {
    try {
      // Get last 4 Fridays
      const fridays = getLastFridays(4)
      const weeklyData: WeeklyData[] = []

      for (const friday of fridays) {
        const response = await attendanceAPI.getChildrenWithStatus(friday, classId)
        if (response.success && response.data) {
          const children = response.data
          const total = children.length
          const present = children.filter((child: any) => child.present).length
          const rate = total > 0 ? (present / total) * 100 : 0
          
          weeklyData.push({
            date: friday,
            present,
            total,
            rate
          })
        }
      }

      setWeeklyData(weeklyData)
      return weeklyData
    } catch (error) {
      console.error('Error fetching weekly stats:', error)
      return []
    }
  }

  const getLastFridays = (count: number) => {
    const fridays = []
    const today = new Date()
    let current = new Date(today)
    
    // Find most recent Friday
    while (current.getDay() !== 5) {
      current.setDate(current.getDate() - 1)
    }
    
    // Get last 'count' Fridays
    for (let i = 0; i < count; i++) {
      fridays.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() - 7)
    }
    
    return fridays.reverse()
  }

  const calculateClassStatistics = async (childrenData: any[]) => {
    try {
      // Group children by class
      const classGroups: { [key: string]: any[] } = {}
      
      childrenData.forEach((child: any) => {
        const classId = child.class?._id || child.classId
        if (classId) {
          if (!classGroups[classId]) {
            classGroups[classId] = []
          }
          classGroups[classId].push(child)
        }
      })

      // Calculate stats for each class and filter out experimental classes
      const classStatsArray: ClassStats[] = Object.keys(classGroups)
        .map(classId => {
          const classChildren = classGroups[classId]
          const totalChildren = classChildren.length
          const presentToday = classChildren.filter((child: any) => child.present).length
          const attendanceRate = totalChildren > 0 ? (presentToday / totalChildren) * 100 : 0
          
          return {
            className: classChildren[0]?.class?.name || classChildren[0]?.className || 'فصل غير محدد',
            totalChildren,
            presentToday,
            attendanceRate
          }
        })
        .filter(classData => {
          // Filter out experimental/test classes
          const name = classData.className.toLowerCase()
          return !name.includes('تجريبي') && 
                 !name.includes('اختبار') && 
                 !name.includes('test') && 
                 !name.includes('experimental')
        })

      // Sort by attendance rate descending
      classStatsArray.sort((a, b) => b.attendanceRate - a.attendanceRate)
      
      console.log('Class statistics calculated:', classStatsArray)
      setClassStats(classStatsArray)

    } catch (error) {
      console.error('Error calculating class statistics:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 text-right">الإحصائيات</h1>
        <p className="text-gray-600 text-right mt-2">تقارير الحضور والإحصائيات العامة</p>
      </div>

      {/* Date and Class Selection */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              اختر التاريخ
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-right w-full"
              title="اختر التاريخ"
              placeholder="اختر التاريخ"
            />
          </div>
          
          {/* اختيار الفصل - لأمين الخدمة والأدمن فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                اختر الفصل
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-right w-full"
              >
                <option value="">جميع الفصول</option>
                {/* سيتم تحميل الفصول من API */}
              </select>
            </div>
          )}
          
          {/* عرض اسم الفصل لمدرسي الفصول */}
          {(user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                الفصل المخصص
              </label>
              <div className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-right">
                {user.assignedClass.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">👥</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalChildren}</div>
            <div className="text-sm text-gray-600">إجمالي الأطفال</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">✅</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.presentToday}</div>
            <div className="text-sm text-gray-600">الحاضرون اليوم</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">❌</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.absentToday}</div>
            <div className="text-sm text-gray-600">الغائبون اليوم</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">📊</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.attendanceRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">معدل الحضور</div>
          </div>
        </div>
      </div>

      {/* Weekly Attendance Chart */}
      {weeklyData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-right">الحضور الأسبوعي (آخر 4 جمعات)</h2>
          <div className="flex items-end justify-between gap-4 h-40">
            {weeklyData.map((week, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="text-sm font-medium text-gray-700 mb-2">{week.present}</div>
                <div 
                  className="w-full bg-blue-500 rounded-t-lg min-h-[10px] flex items-end justify-center transition-all duration-300"
                  style={{ height: `${(week.rate / 100) * 120}px` }}
                >
                </div>
                <div className="text-xs text-gray-600 mt-2 text-center">
                  {new Date(week.date).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit' })}
                </div>
                <div className="text-xs text-gray-500">{week.rate.toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consecutive Absent Children */}
      {stats.consecutiveAbsent && stats.consecutiveAbsent.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-right">الأطفال المتغيبون باستمرار</h2>
          <div className="space-y-3">
            {stats.consecutiveAbsent.slice(0, 10).map((child: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">
                    {child.consecutiveAbsences || 0}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{child.name}</div>
                    <div className="text-sm text-gray-600">{child.className}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-red-600">
                    {child.consecutiveAbsences || 0} جمعة متتالية
                  </div>
                  <div className="text-xs text-gray-500">
                    آخر حضور: {child.lastAttendance ? new Date(child.lastAttendance).toLocaleDateString('ar-EG') : 'لم يحضر مطلقاً'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Rate Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-right">معدل الحضور العام</h2>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-green-500 h-4 rounded-full transition-all duration-300"
            style={{ width: `${stats.attendanceRate}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>0%</span>
          <span className="font-medium">{stats.attendanceRate.toFixed(1)}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Class Statistics */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-gray-900 text-right">إحصائيات الفصول</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم الفصل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  إجمالي الأطفال
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحاضرون
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  معدل الحضور
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التقدم
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classStats.map((classItem, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {classItem.className}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {classItem.totalChildren}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {classItem.presentToday}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      classItem.attendanceRate >= 80 
                        ? 'bg-green-100 text-green-800' 
                        : classItem.attendanceRate >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {classItem.attendanceRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          classItem.attendanceRate >= 80 
                            ? 'bg-green-500' 
                            : classItem.attendanceRate >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${classItem.attendanceRate}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {classStats.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد بيانات إحصائية متاحة</p>
          </div>
        )}
      </div>

      {/* Summary Cards - لأمين الخدمة فقط */}
      {(user?.role === 'admin' || user?.role === 'serviceLeader') && classStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {classStats.filter(c => c.attendanceRate >= 80).length}
              </div>
              <div className="text-sm text-green-700">فصول بحضور ممتاز (80%+)</div>
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-2">
                {classStats.filter(c => c.attendanceRate >= 60 && c.attendanceRate < 80).length}
              </div>
              <div className="text-sm text-yellow-700">فصول بحضور متوسط (60-80%)</div>
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-2">
                {classStats.filter(c => c.attendanceRate < 60).length}
              </div>
              <div className="text-sm text-red-700">فصول تحتاج متابعة (&lt;60%)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
