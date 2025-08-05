'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { api } from '@/services/api'
import Cookies from 'js-cookie'

interface DashboardStats {
  totalChildren: number
  todayAttendance: number
  todayAbsence: number
  attendanceRate: number
  totalClasses?: number
  totalServants?: number
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    console.log('🔄 Dashboard useEffect - Auth state changed:', { isLoading, isAuthenticated, hasUser: !!user })
    
    let isMounted = true
    
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('❌ المستخدم غير مسجل دخول - إعادة توجيه للتسجيل')
        if (isMounted) {
          router.push('/login')
        }
        return
      }
      
      if (isAuthenticated && user && isMounted) {
        console.log('✅ المستخدم مسجل دخول - جلب الإحصائيات')
        fetchDashboardStats()
      }
    }

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, isLoading, router, user])

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true)
      console.log('🔍 بدء جلب الإحصائيات...')
      console.log('👤 Current user:', user)
      console.log('🔐 Is authenticated:', isAuthenticated)
      
      // التحقق من وجود توكن
      const token = Cookies.get('auth_token') || Cookies.get('userToken')
      if (!token) {
        console.log('❌ لا يوجد توكن مصادقة')
        setStats({
          totalChildren: 0,
          todayAttendance: 0,
          todayAbsence: 0,
          attendanceRate: 0
        })
        return
      }
      console.log('✅ توكن المصادقة موجود:', token.substring(0, 20) + '...')
      
      // جلب الإحصائيات من API المخصص للكنيسة
      console.log('📊 جلب إحصائيات الكنيسة من:', `${api.defaults.baseURL}/statistics/church`)
      const statsResponse = await api.get('/statistics/church')
      console.log('✅ استجابة الإحصائيات:', statsResponse.data)
      
      const statsData = statsResponse.data.data || {}
      const dashboardStats: DashboardStats = {
        totalChildren: statsData.totalChildren || 0,
        todayAttendance: statsData.presentToday || 0,
        todayAbsence: statsData.absentToday || 0, // استخدم البيانات الفعلية من API
        attendanceRate: Math.round(statsData.attendanceRate || 0)
      }

      console.log('📈 الإحصائيات المحولة للعرض:', dashboardStats)

      // للأدمن وأمين الخدمة - البيانات ستأتي من API الإحصائيات
      if (user?.role === 'admin' || user?.role === 'serviceLeader') {
        dashboardStats.totalClasses = statsData.totalClasses || 0
        dashboardStats.totalServants = statsData.totalServants || 0
        console.log('✅ إحصائيات إضافية من API الإحصائيات:', { classes: dashboardStats.totalClasses, servants: dashboardStats.totalServants })
      }

      console.log('📈 النتيجة النهائية:', dashboardStats)
      
      // التأكد من أن المكون ما زال mounted قبل تحديث الحالة
      setStats(dashboardStats)
      console.log('✅ تم تحديث الإحصائيات بنجاح')
    } catch (error: any) {
      console.error('❌ خطأ في جلب إحصائيات Dashboard:', error)
      console.error('📝 Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      })
      
      // تحقق من نوع الخطأ
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        console.log('🔐 خطأ في المصادقة - إعادة توجيه للتسجيل')
        // إعادة توجيه للتسجيل
        router.push('/login')
        return
      }
      
      // في حالة الخطأ، استخدم قيم افتراضية
      setStats({
        totalChildren: 0,
        todayAttendance: 0,
        todayAbsence: 0,
        attendanceRate: 0
      })
    } finally {
      setLoadingStats(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    console.log('🚨 إعادة توجيه للتسجيل - isAuthenticated:', isAuthenticated, 'user:', user)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">جاري إعادة التوجيه...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                نظام إدارة كنيسة مار جرجس
              </h1>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              {isAuthenticated && user ? (
                <>
                  <span className="text-sm text-gray-700">
                    مرحباً خادم {user.name || user.username}
                    {user.assignedClass && (
                      <span className="text-gray-500 mr-2">- {user.assignedClass.name}</span>
                    )}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  تسجيل الدخول
                </button>
              )}
            </div>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">⚠️</span>
                </div>
              </div>
              <div className="mr-3">
                <h3 className="text-sm font-medium text-amber-800">
                  تسجيل الدخول مطلوب
                </h3>
                <div className="mt-1 text-sm text-amber-700">
                  يرجى تسجيل الدخول لعرض الإحصائيات والبيانات الكاملة للنظام.
                  <button 
                    onClick={() => router.push('/login')}
                    className="mr-2 font-medium underline hover:text-amber-800"
                  >
                    سجل دخولك الآن
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            لوحة التحكم الرئيسية
          </h2>
          <p className="text-gray-600">
            مرحباً بك في نظام إدارة الكنيسة. يمكنك الوصول لجميع الخدمات من هنا.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* إجمالي الأطفال */}
          <div key="total-children" className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">👥</span>
                </div>
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    إجمالي الأطفال
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loadingStats ? (
                      <div className="animate-pulse">--</div>
                    ) : !isAuthenticated ? (
                      <span className="text-amber-600">سجل دخولك لعرض البيانات</span>
                    ) : stats?.totalChildren === 0 ? (
                      <span className="text-gray-400">لا توجد بيانات</span>
                    ) : (
                      stats?.totalChildren || 0
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* الحضور اليوم */}
          <div key="today-attendance" className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">✅</span>
                </div>
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    الحضور اليوم
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loadingStats ? (
                      <div className="animate-pulse">--</div>
                    ) : !isAuthenticated ? (
                      <span className="text-amber-600">سجل دخولك لعرض البيانات</span>
                    ) : stats?.todayAttendance === 0 && stats?.totalChildren === 0 ? (
                      <span className="text-gray-400">لا توجد بيانات</span>
                    ) : (
                      stats?.todayAttendance || 0
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* الغياب اليوم */}
          <div key="today-absence" className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">❌</span>
                </div>
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    الغياب اليوم
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loadingStats ? (
                      <div className="animate-pulse">--</div>
                    ) : !isAuthenticated ? (
                      <span className="text-amber-600">سجل دخولك لعرض البيانات</span>
                    ) : stats?.todayAbsence === 0 && stats?.totalChildren === 0 ? (
                      <span className="text-gray-400">لا توجد بيانات</span>
                    ) : (
                      stats?.todayAbsence || 0
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* متوسط الحضور */}
          <div key="attendance-rate" className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">📊</span>
                </div>
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    متوسط الحضور
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loadingStats ? (
                      <div className="animate-pulse">--</div>
                    ) : !isAuthenticated ? (
                      <span className="text-amber-600">سجل دخولك لعرض البيانات</span>
                    ) : stats?.attendanceRate === 0 && stats?.totalChildren === 0 ? (
                      <span className="text-gray-400">لا توجد بيانات</span>
                    ) : (
                      `${stats?.attendanceRate || 0}%`
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* الفصول - لأمين الخدمة والأدمن فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <div key="total-classes" className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm">📚</span>
                  </div>
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      الفصول
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loadingStats ? '--' : stats?.totalClasses || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* الخدام - لأمين الخدمة والأدمن فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <div key="total-servants" className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm">👨‍🏫</span>
                  </div>
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      الخدام
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loadingStats ? '--' : stats?.totalServants || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            key="nav-children"
            onClick={() => router.push('/children')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">👥</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                إدارة الأطفال
              </h3>
              <p className="text-sm text-gray-500">
                عرض وإدارة بيانات الأطفال والتسجيل
              </p>
            </div>
          </button>

          <button
            key="nav-attendance"
            onClick={() => router.push('/attendance')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">✅</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                تسجيل حضور الأطفال
              </h3>
              <p className="text-sm text-gray-500">
                تسجيل حضور الأطفال وإدارة الغياب
              </p>
            </div>
          </button>

          {/* حضور الخدام - لأمين الخدمة والأدمن فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <button
              key="nav-servants-attendance"
              onClick={() => router.push('/servants-attendance')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">👨‍💼</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  تسجيل حضور الخدام
                </h3>
                <p className="text-sm text-gray-500">
                  تسجيل حضور الخدام مع إمكانية الملاحظات
                </p>
              </div>
            </button>
          )}

          <button
            key="nav-statistics"
            onClick={() => router.push('/statistics')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">📊</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                الإحصائيات الأساسية
              </h3>
              <p className="text-sm text-gray-500">
                عرض تقارير الحضور والإحصائيات الأساسية
              </p>
            </div>
          </button>

          <button
            key="nav-advanced-statistics"
            onClick={() => router.push('/advanced-statistics')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">📈</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                الإحصائيات المتقدمة
              </h3>
              <p className="text-sm text-gray-500">
                تحليلات متقدمة ومقارنات وتكرار أخذ الحضور
              </p>
            </div>
          </button>

          {/* إدارة الخدام - لأمين الخدمة فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <button
              key="nav-servants"
              onClick={() => router.push('/servants')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">👨‍🏫</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  إدارة الخدام
                </h3>
                <p className="text-sm text-gray-500">
                  إدارة بيانات الخدام وإحصائياتهم
                </p>
              </div>
            </button>
          )}

          {/* لوحة تحكم أمين الخدمة - لأمين الخدمة والأدمن فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <button
              key="nav-service-leader-dashboard"
              onClick={() => router.push('/service-leader-dashboard')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">🎯</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  لوحة تحكم أمين الخدمة
                </h3>
                <p className="text-sm text-gray-500">
                  نظرة شاملة على إحصائيات الخدمة والحضور
                </p>
              </div>
            </button>
          )}

          {/* المواظبون على الحضور - لأمين الخدمة والأدمن فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <button
              key="nav-consecutive-attendance"
              onClick={() => router.push('/consecutive-attendance')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">🏆</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  المواظبون على الحضور
                </h3>
                <p className="text-sm text-gray-500">
                  تقرير الأطفال المواظبين لـ 4 أسابيع متتالية
                </p>
              </div>
            </button>
          )}

          {/* المواظبون في فصلي - لمدرسي الفصول */}
          {(user?.role === 'classTeacher' || user?.role === 'servant') && (
            <button
              key="nav-consecutive-attendance-class"
              onClick={() => router.push('/consecutive-attendance')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">🌟</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  المواظبون في فصلي
                </h3>
                <p className="text-sm text-gray-500">
                  أطفال فصلك المواظبين لـ 4 أسابيع متتالية
                </p>
              </div>
            </button>
          )}

          {/* متابعة الخدام - لأمين الخدمة والأدمن فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <button
              key="nav-servants-follow-up"
              onClick={() => router.push('/servants-follow-up')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">📞</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  متابعة الخدام
                </h3>
                <p className="text-sm text-gray-500">
                  الخدام الذين يحتاجون للمتابعة والاتصال
                </p>
              </div>
            </button>
          )}

          {/* إدارة الفصول - لأمين الخدمة فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <button
              key="nav-classes"
              onClick={() => router.push('/classes')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">📚</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  إدارة الفصول
                </h3>
                <p className="text-sm text-gray-500">
                  تنظيم الفصول وتوزيع الأطفال
                </p>
              </div>
            </button>
          )}

          <button
            key="nav-pastoral-care"
            onClick={() => router.push('/pastoral-care')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">📞</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                الافتقاد
              </h3>
              <p className="text-sm text-gray-500">
                متابعة الأطفال الغائبين والاتصال بهم
              </p>
            </div>
          </button>

          {/* المتابعة الفردية للأطفال - لأمين الخدمة ومدرس الفصل */}
          {(user?.role === 'serviceLeader' || user?.role === 'classTeacher') && (
            <button
              onClick={() => router.push('/individual-tracking')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">📈</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  المتابعة الفردية للأطفال
                </h3>
                <p className="text-sm text-gray-500">
                  إحصائيات فردية تفصيلية لكل طفل
                </p>
              </div>
            </button>
          )}

          {/* متابعة الخدام الفردية - لأمين الخدمة والأدمن فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <button
              onClick={() => router.push('/servants-tracking')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">👥</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  متابعة الخدام الفردية
                </h3>
                <p className="text-sm text-gray-500">
                  إحصائيات الخدام مقسمة حسب الفصول
                </p>
              </div>
            </button>
          )}

          {/* متابعة الأطفال الفردية - لأمين الخدمة والأدمن فقط */}
          {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
            <button
              onClick={() => router.push('/children-tracking')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">👶</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  متابعة الأطفال الفردية
                </h3>
                <p className="text-sm text-gray-500">
                  إحصائيات الأطفال مقسمة حسب الفصول
                </p>
              </div>
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
