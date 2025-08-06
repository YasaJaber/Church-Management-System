'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { API_BASE_URL } from '@/services/api'

interface DashboardStats {
  children: {
    total: number
    present: number
    attendanceRate: number
  }
  servants: {
    total: number
    present: number
    attendanceRate: number
    needingFollowUp: number
  }
  classes: {
    total: number
    excellentAttendance: number
    needsImprovement: number
  }
  consecutive: {
    children: number
    averageWeeks: number
  }
}

export default function ServiceLeaderDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [stats, setStats] = useState<DashboardStats>({
    children: { total: 0, present: 0, attendanceRate: 0 },
    servants: { total: 0, present: 0, attendanceRate: 0, needingFollowUp: 0 },
    classes: { total: 0, excellentAttendance: 0, needsImprovement: 0 },
    consecutive: { children: 0, averageWeeks: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    if (isAuthenticated && user) {
      // فقط أمين الخدمة والأدمن يمكنهم الوصول لهذه الصفحة
      if (user.role !== 'admin' && user.role !== 'serviceLeader') {
        router.push('/statistics')
        return
      }
      
      fetchDashboardData()
    }
  }, [isAuthenticated, isLoading, router, user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      // جلب إحصائيات الأطفال
      const childrenResponse = await fetch(`${API_BASE_URL}/statistics/church`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      // جلب إحصائيات الخدام
      const servantsResponse = await fetch(`${API_BASE_URL}/servants/statistics/general`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      // جلب الخدام المحتاجين متابعة
      const followUpResponse = await fetch(`${API_BASE_URL}/servants/statistics/follow-up`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      // جلب الأطفال المواظبين
      const consecutiveResponse = await fetch(`${API_BASE_URL}/statistics/consecutive-attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const [childrenData, servantsData, followUpData, consecutiveData] = await Promise.all([
        childrenResponse.ok ? childrenResponse.json() : { success: false },
        servantsResponse.ok ? servantsResponse.json() : { success: false },
        followUpResponse.ok ? followUpResponse.json() : { success: false },
        consecutiveResponse.ok ? consecutiveResponse.json() : { success: false }
      ])

      // تجميع البيانات
      const newStats: DashboardStats = {
        children: {
          total: childrenData.success ? childrenData.data.totalChildren : 0,
          present: childrenData.success ? childrenData.data.presentToday : 0,
          attendanceRate: childrenData.success ? childrenData.data.attendanceRate : 0
        },
        servants: {
          total: servantsData.success ? servantsData.data.totalServants : 0,
          present: servantsData.success ? servantsData.data.presentToday : 0,
          attendanceRate: servantsData.success ? servantsData.data.attendanceRate : 0,
          needingFollowUp: followUpData.success ? (followUpData.data || []).length : 0
        },
        classes: {
          total: 0, // سيتم حسابها لاحقاً
          excellentAttendance: 0,
          needsImprovement: 0
        },
        consecutive: {
          children: consecutiveData.success ? (consecutiveData.data || []).length : 0,
          averageWeeks: consecutiveData.success && consecutiveData.data?.length > 0 
            ? consecutiveData.data.reduce((sum: number, child: any) => sum + child.consecutiveWeeks, 0) / consecutiveData.data.length 
            : 0
        }
      }

      setStats(newStats)
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error)
      setError(error.message || 'حدث خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 text-right">لوحة تحكم أمين الخدمة</h1>
        <p className="text-gray-600 text-right mt-2">نظرة شاملة على إحصائيات الخدمة والحضور</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-right">
          {error}
        </div>
      )}

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">👶</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.children.total}</div>
            <div className="text-sm text-gray-600">إجمالي الأطفال</div>
            <div className="text-xs text-blue-600 mt-1">
              حاضر اليوم: {stats.children.present} ({stats.children.attendanceRate.toFixed(1)}%)
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">👥</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.servants.total}</div>
            <div className="text-sm text-gray-600">إجمالي الخدام</div>
            <div className="text-xs text-green-600 mt-1">
              حاضر اليوم: {stats.servants.present} ({stats.servants.attendanceRate.toFixed(1)}%)
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">🏆</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.consecutive.children}</div>
            <div className="text-sm text-gray-600">أطفال مواظبون</div>
            <div className="text-xs text-purple-600 mt-1">
              متوسط: {stats.consecutive.averageWeeks.toFixed(1)} أسبوع
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="text-center">
            <div className={`w-12 h-12 ${stats.servants.needingFollowUp > 0 ? 'bg-red-500' : 'bg-green-500'} rounded-lg flex items-center justify-center mx-auto mb-4`}>
              <span className="text-white text-xl">{stats.servants.needingFollowUp > 0 ? '⚠️' : '✅'}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.servants.needingFollowUp}</div>
            <div className="text-sm text-gray-600">خدام يحتاجون متابعة</div>
            <div className={`text-xs mt-1 ${stats.servants.needingFollowUp > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.servants.needingFollowUp > 0 ? 'يحتاج اهتمام' : 'كله تمام'}
            </div>
          </div>
        </div>
      </div>

      {/* الروابط السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link href="/consecutive-attendance" className="block">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow hover:shadow-md transition-shadow text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">المواظبون على الحضور</h3>
                <p className="text-blue-100 text-sm mt-1">الأطفال الملتزمون بالحضور 4 أسابيع متتالية</p>
                <div className="text-2xl font-bold mt-2">{stats.consecutive.children} طفل</div>
              </div>
              <div className="text-3xl">🏆</div>
            </div>
          </div>
        </Link>

        <Link href="/servants-follow-up" className="block">
          <div className={`bg-gradient-to-r ${stats.servants.needingFollowUp > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} p-6 rounded-lg shadow hover:shadow-md transition-shadow text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">متابعة الخدام</h3>
                <p className={`${stats.servants.needingFollowUp > 0 ? 'text-red-100' : 'text-green-100'} text-sm mt-1`}>
                  الخدام الذين يحتاجون للمتابعة والاتصال
                </p>
                <div className="text-2xl font-bold mt-2">{stats.servants.needingFollowUp} خادم</div>
              </div>
              <div className="text-3xl">{stats.servants.needingFollowUp > 0 ? '📞' : '✅'}</div>
            </div>
          </div>
        </Link>

        <Link href="/statistics" className="block">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg shadow hover:shadow-md transition-shadow text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">الإحصائيات التفصيلية</h3>
                <p className="text-purple-100 text-sm mt-1">تقارير شاملة عن الحضور والفصول</p>
                <div className="text-2xl font-bold mt-2">{stats.children.attendanceRate.toFixed(1)}%</div>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>
        </Link>
      </div>

      {/* تحديث البيانات */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'جاري التحديث...' : 'تحديث البيانات'}
          </button>
          <div className="text-sm text-gray-600">
            آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
          </div>
        </div>
      </div>

      {/* ملخص الحالة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-right">حالة الأطفال</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">معدل الحضور العام</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stats.children.attendanceRate >= 80 ? 'bg-green-500' : 
                      stats.children.attendanceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${stats.children.attendanceRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{stats.children.attendanceRate.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">الأطفال المواظبون</span>
              <span className="text-sm font-medium text-green-600">
                {stats.consecutive.children} من {stats.children.total}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">الحاضرون اليوم</span>
              <span className="text-sm font-medium text-blue-600">
                {stats.children.present} من {stats.children.total}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-right">حالة الخدام</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">معدل حضور الخدام</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stats.servants.attendanceRate >= 80 ? 'bg-green-500' : 
                      stats.servants.attendanceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${stats.servants.attendanceRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{stats.servants.attendanceRate.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">يحتاجون متابعة</span>
              <span className={`text-sm font-medium ${stats.servants.needingFollowUp > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.servants.needingFollowUp} من {stats.servants.total}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">الحاضرون اليوم</span>
              <span className="text-sm font-medium text-blue-600">
                {stats.servants.present} من {stats.servants.total}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* تنبيهات */}
      {(stats.servants.needingFollowUp > 0 || stats.children.attendanceRate < 70) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-yellow-800 mb-3 text-right">تنبيهات تحتاج اهتمام</h3>
          <div className="space-y-2">
            {stats.servants.needingFollowUp > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-700">
                  يوجد {stats.servants.needingFollowUp} خدام يحتاجون متابعة عاجلة
                </span>
                <Link href="/servants-follow-up" className="text-yellow-800 hover:text-yellow-900 underline">
                  عرض التفاصيل
                </Link>
              </div>
            )}
            {stats.children.attendanceRate < 70 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-700">
                  معدل حضور الأطفال منخفض ({stats.children.attendanceRate.toFixed(1)}%)
                </span>
                <Link href="/statistics" className="text-yellow-800 hover:text-yellow-900 underline">
                  عرض الإحصائيات
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
