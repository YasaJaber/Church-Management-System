'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { FORCE_PRODUCTION_API as API_BASE_URL } from '@/config/api'
import {
  AttendanceTrendLineChart,
  DailyAttendanceRateChart,
  ClassComparisonBarChart,
  AttendanceDistributionChart,
  WeeklyComparisonChart,
} from '@/components/AdvancedCharts'

console.log('🚀 Advanced Statistics API URL:', API_BASE_URL)

interface AttendanceTrend {
  date: string
  present: number
  absent: number
  total: number
}

interface ClassComparison {
  classId: string
  className: string
  category: string
  totalChildren: number
  totalSessions: number
  presentCount: number
  absentCount: number
  attendanceRate: number
  avgAttendancePerSession: number
}

interface ClassItem {
  _id: string
  name: string
  category: string
}

export default function AdvancedStatisticsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('trends')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedClass, setSelectedClass] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // بيانات الإحصائيات
  const [trendsData, setTrendsData] = useState<AttendanceTrend[]>([])
  const [classComparison, setClassComparison] = useState<ClassComparison[]>([])
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([])

  const fetchAvailableClasses = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      const response = await fetch(`${API_BASE_URL}/classes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setAvailableClasses(data.data)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      console.log('🔍 Fetching statistics for tab:', activeTab)
      console.log('📊 Parameters:', { selectedPeriod, selectedClass, startDate, endDate })
      
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(selectedClass && { classId: selectedClass }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      })

      if (activeTab === 'trends' || activeTab === 'weekly' || activeTab === 'daily') {
        console.log('📈 Fetching trends...')
        const response = await fetch(`${API_BASE_URL}/advanced-statistics/attendance-trends?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        console.log('📈 Trends response:', data)
        if (data.success) {
          setTrendsData(data.data.trends)
        } else {
          console.error('❌ Trends error:', data.error)
        }
      }

      if (activeTab === 'comparison' && (user?.role === 'admin' || user?.role === 'serviceLeader')) {
        console.log('⚖️ Fetching comparison...')
        const response = await fetch(`${API_BASE_URL}/advanced-statistics/class-comparison?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        console.log('⚖️ Comparison response:', data)
        if (data.success) {
          setClassComparison(data.data.classComparisons)
        } else {
          console.error('❌ Comparison error:', data.error)
        }
      }

    } catch (error) {
      console.error('❌ Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedPeriod, selectedClass, startDate, endDate, user])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    if (isAuthenticated && user) {
      fetchAvailableClasses()
      
      // للمدرسين، نحط الفصل المخصص لهم تلقائياً
      if ((user.role === 'classTeacher' || user.role === 'servant') && user.assignedClass) {
        setSelectedClass(user.assignedClass._id)
      }
      
      fetchStatistics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, router, user])

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics()
    }
  }, [selectedPeriod, selectedClass, startDate, endDate, activeTab, isAuthenticated, fetchStatistics])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-800'
    if (rate >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل الإحصائيات المتقدمة...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">يرجى تسجيل الدخول أولاً</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📊 الإحصائيات المتقدمة والتحليلات البيانية
          </h1>
          <p className="text-gray-600">
            {user?.role === 'admin' || user?.role === 'serviceLeader' 
              ? 'رسوم بيانية تفاعلية ومقارنات شاملة مع تحليل الاتجاهات' 
              : 'رسوم بيانية وتحليلات مفصلة لفصلك'}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الفترة الزمنية</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="اختر الفترة الزمنية"
              >
                <option value="week">أسبوع</option>
                <option value="month">شهر</option>
                <option value="quarter">ربع سنة</option>
                <option value="year">سنة</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الفصل</label>
              {(user?.role === 'admin' || user?.role === 'serviceLeader') ? (
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  title="اختر الفصل"
                >
                  <option value="">جميع الفصول</option>
                  {availableClasses.map((classItem) => (
                    <option key={classItem._id} value={classItem._id}>
                      {classItem.name} ({classItem.category})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  {availableClasses.find(c => c._id === selectedClass)?.name || 'فصلك'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="تاريخ البداية"
                placeholder="اختر تاريخ البداية"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="تاريخ النهاية"
                placeholder="اختر تاريخ النهاية"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" dir="ltr">
              <button
                onClick={() => setActiveTab('trends')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'trends'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📈 منحنى الاتجاهات
              </button>

              <button
                onClick={() => setActiveTab('daily')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'daily'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📅 التحليل اليومي
              </button>

              <button
                onClick={() => setActiveTab('weekly')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'weekly'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 المقارنة الأسبوعية
              </button>

              {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'comparison'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ⚖️ مقارنة الفصول
                </button>
              )}

              <button
                onClick={() => setActiveTab('distribution')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'distribution'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎯 التوزيع الإجمالي
              </button>

              <button
                onClick={() => setActiveTab('table')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'table'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 جدول المقارنة اليومية
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* منحنى الاتجاهات */}
            {activeTab === 'trends' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  📈 منحنى الحضور والغياب عبر الوقت
                </h3>
                <p className="text-gray-600 mb-6">
                  رسم بياني خطي يوضح الاتجاهات والأنماط في الحضور والغياب
                </p>
                
                {trendsData.length > 0 ? (
                  <div className="space-y-8">
                    {/* Chart */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <AttendanceTrendLineChart data={trendsData} />
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-green-100 mr-4">
                            <span className="text-2xl">✅</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {trendsData.reduce((sum, item) => sum + item.present, 0)}
                            </div>
                            <div className="text-sm text-green-700">إجمالي الحاضرين</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-red-100 mr-4">
                            <span className="text-2xl">❌</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-red-600">
                              {trendsData.reduce((sum, item) => sum + item.absent, 0)}
                            </div>
                            <div className="text-sm text-red-700">إجمالي الغائبين</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-blue-100 mr-4">
                            <span className="text-2xl">📅</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {trendsData.length}
                            </div>
                            <div className="text-sm text-blue-700">عدد الأيام</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-purple-100 mr-4">
                            <span className="text-2xl">📊</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">
                              {trendsData.length > 0 ? 
                                Math.round((trendsData.reduce((sum, item) => 
                                  sum + (item.total > 0 ? (item.present / item.total) * 100 : 0), 0
                                ) / trendsData.length) * 100) / 100 : 0}%
                            </div>
                            <div className="text-sm text-purple-700">متوسط معدل الحضور</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📊</div>
                    <p className="text-gray-600">لا توجد بيانات للفترة المحددة</p>
                    <p className="text-sm text-gray-500 mt-2">جرب تغيير الفترة الزمنية أو الفصل المحدد</p>
                  </div>
                )}
              </div>
            )}

            {/* التحليل اليومي */}
            {activeTab === 'daily' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  📅 معدل الحضور اليومي
                </h3>
                <p className="text-gray-600 mb-6">
                  رسم بياني يوضح معدل الحضور بالنسبة المئوية لكل يوم
                </p>
                
                {trendsData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <DailyAttendanceRateChart data={trendsData} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📅</div>
                    <p className="text-gray-600">لا توجد بيانات للفترة المحددة</p>
                  </div>
                )}
              </div>
            )}

            {/* المقارنة الأسبوعية */}
            {activeTab === 'weekly' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  📊 المقارنة الأسبوعية
                </h3>
                <p className="text-gray-600 mb-6">
                  مقارنة متوسطات الحضور والغياب بين الأسابيع المختلفة
                </p>
                
                {trendsData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <WeeklyComparisonChart data={trendsData} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📊</div>
                    <p className="text-gray-600">لا توجد بيانات للفترة المحددة</p>
                  </div>
                )}
              </div>
            )}

            {/* مقارنة الفصول */}
            {activeTab === 'comparison' && (user?.role === 'admin' || user?.role === 'serviceLeader') && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  ⚖️ مقارنة معدلات الحضور بين الفصول
                </h3>
                <p className="text-gray-600 mb-6">
                  رسم بياني شريطي يوضح معدل الحضور لكل فصل
                </p>
                
                {classComparison.length > 0 ? (
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <ClassComparisonBarChart 
                        data={classComparison.map(item => ({
                          className: item.className,
                          attendanceRate: item.attendanceRate,
                          presentCount: item.presentCount,
                          absentCount: item.absentCount,
                        }))} 
                      />
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="text-2xl font-bold text-blue-600">
                          {classComparison.length}
                        </div>
                        <div className="text-sm text-blue-700">عدد الفصول</div>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round((classComparison.reduce((sum, item) => sum + item.attendanceRate, 0) / Math.max(classComparison.length, 1)) * 100) / 100}%
                        </div>
                        <div className="text-sm text-green-700">متوسط معدل الحضور</div>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                        <div className="text-2xl font-bold text-purple-600">
                          {classComparison.reduce((sum, item) => sum + item.presentCount, 0)}
                        </div>
                        <div className="text-sm text-purple-700">إجمالي الحضور</div>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                        <div className="text-2xl font-bold text-orange-600">
                          {classComparison.reduce((sum, item) => sum + item.totalChildren, 0)}
                        </div>
                        <div className="text-sm text-orange-700">إجمالي الأطفال</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">⚖️</div>
                    <p className="text-gray-600">لا توجد بيانات للمقارنة</p>
                  </div>
                )}
              </div>
            )}

            {/* التوزيع الإجمالي */}
            {activeTab === 'distribution' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  🎯 التوزيع الإجمالي للحضور والغياب
                </h3>
                <p className="text-gray-600 mb-6">
                  رسم دائري يوضح نسبة الحضور والغياب من الإجمالي
                </p>
                
                {trendsData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex justify-center">
                      <AttendanceDistributionChart data={trendsData} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🎯</div>
                    <p className="text-gray-600">لا توجد بيانات للفترة المحددة</p>
                  </div>
                )}
              </div>
            )}

            {/* جدول المقارنة اليومية */}
            {activeTab === 'table' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  📋 جدول المقارنة اليومية للحضور والغياب
                </h3>
                <p className="text-gray-600 mb-6">
                  عرض تفصيلي لكل يوم مع إمكانية المقارنة المباشرة بين الأيام
                </p>
                
                {trendsData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-700 mb-1">عدد الأيام</div>
                        <div className="text-2xl font-bold text-blue-600">{trendsData.length}</div>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-sm text-green-700 mb-1">أعلى حضور في يوم</div>
                        <div className="text-2xl font-bold text-green-600">
                          {Math.max(...trendsData.map(d => d.present))}
                        </div>
                      </div>
                      
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="text-sm text-red-700 mb-1">أعلى غياب في يوم</div>
                        <div className="text-2xl font-bold text-red-600">
                          {Math.max(...trendsData.map(d => d.absent))}
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="text-sm text-purple-700 mb-1">متوسط الحضور يومياً</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round(trendsData.reduce((sum, d) => sum + d.present, 0) / trendsData.length)}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 border-b border-blue-700">
                        <h4 className="text-lg font-semibold text-white flex items-center">
                          <span className="mr-2">📊</span>
                          تفاصيل الحضور اليومي
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                #
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                التاريخ
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                اليوم
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-green-50">
                                الحاضرون
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-red-50">
                                الغائبون
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                الإجمالي
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-blue-50">
                                معدل الحضور
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                الفرق عن المتوسط
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {trendsData.map((item, index) => {
                              const attendanceRate = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0
                              const avgPresent = Math.round(trendsData.reduce((sum, d) => sum + d.present, 0) / trendsData.length)
                              const diff = item.present - avgPresent
                              const date = new Date(item.date)
                              const dayName = date.toLocaleDateString('ar-EG', { weekday: 'long' })
                              
                              return (
                                <tr 
                                  key={item.date} 
                                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-all duration-200`}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                                    {index + 1}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {date.toLocaleDateString('ar-EG', { 
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                      {dayName}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 bg-green-50">
                                    <div className="flex items-center">
                                      <span className="text-xl mr-2">✅</span>
                                      <span className="text-lg">{item.present}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 bg-red-50">
                                    <div className="flex items-center">
                                      <span className="text-xl mr-2">❌</span>
                                      <span className="text-lg">{item.absent}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                                    {item.total}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap bg-blue-50">
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                      <div className="flex-1">
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full ${
                                              attendanceRate >= 80 ? 'bg-green-500' :
                                              attendanceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${attendanceRate}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                                        attendanceRate >= 80 ? 'bg-green-100 text-green-800' :
                                        attendanceRate >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {attendanceRate}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                    {diff > 0 ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                                        <span className="mr-1">↑</span>
                                        +{diff}
                                      </span>
                                    ) : diff < 0 ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800">
                                        <span className="mr-1">↓</span>
                                        {diff}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                                        <span className="mr-1">→</span>
                                        0
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <tr>
                              <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-700">
                                الإجمالي الكلي
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-green-700 bg-green-100">
                                {trendsData.reduce((sum, item) => sum + item.present, 0)}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-red-700 bg-red-100">
                                {trendsData.reduce((sum, item) => sum + item.absent, 0)}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-700">
                                {trendsData.reduce((sum, item) => sum + item.total, 0)}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-blue-700 bg-blue-100">
                                {trendsData.length > 0 ? 
                                  Math.round((trendsData.reduce((sum, item) => 
                                    sum + (item.total > 0 ? (item.present / item.total) * 100 : 0), 0
                                  ) / trendsData.length) * 100) / 100 : 0}%
                              </td>
                              <td className="px-6 py-4"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Statistics Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <span className="mr-2">📈</span>
                        ملخص الإحصائيات
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-gray-600 mb-1">أفضل يوم حضور</div>
                          <div className="font-bold text-green-600 text-lg">
                            {(() => {
                              const bestDay = trendsData.reduce((best, current) => 
                                current.present > best.present ? current : best
                              , trendsData[0])
                              return new Date(bestDay.date).toLocaleDateString('ar-EG', { 
                                weekday: 'short', 
                                day: 'numeric',
                                month: 'short'
                              })
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.max(...trendsData.map(d => d.present))} حاضر
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-gray-600 mb-1">أسوأ يوم حضور</div>
                          <div className="font-bold text-red-600 text-lg">
                            {(() => {
                              const worstDay = trendsData.reduce((worst, current) => 
                                current.present < worst.present ? current : worst
                              , trendsData[0])
                              return new Date(worstDay.date).toLocaleDateString('ar-EG', { 
                                weekday: 'short', 
                                day: 'numeric',
                                month: 'short'
                              })
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.min(...trendsData.map(d => d.present))} حاضر
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-gray-600 mb-1">الفرق بين الأفضل والأسوأ</div>
                          <div className="font-bold text-purple-600 text-lg">
                            {Math.max(...trendsData.map(d => d.present)) - Math.min(...trendsData.map(d => d.present))}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            تفاوت في الحضور
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📋</div>
                    <p className="text-gray-600">لا توجد بيانات للفترة المحددة</p>
                    <p className="text-sm text-gray-500 mt-2">جرب تغيير الفترة الزمنية أو الفصل المحدد</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
