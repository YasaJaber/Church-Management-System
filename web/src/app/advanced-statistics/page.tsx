'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/services/api'

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

interface FrequencyData {
  date: string
  classesWithAttendance: number
  totalAttendanceRecords: number
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
  const [frequencyData, setFrequencyData] = useState<FrequencyData[]>([])
  const [individualClassData, setIndividualClassData] = useState<any>(null)
  const [availableClasses, setAvailableClasses] = useState<any[]>([])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    if (isAuthenticated && user) {
      fetchAvailableClasses()
      fetchStatistics()
    }
  }, [isAuthenticated, isLoading, router, user])

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics()
    }
  }, [selectedPeriod, selectedClass, startDate, endDate, activeTab])

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

  const fetchStatistics = async () => {
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

      if (activeTab === 'trends') {
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
        console.log('👤 User role:', user?.role)
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
      } else if (activeTab === 'comparison') {
        console.log('❌ Access denied for comparison tab')
        console.log('👤 Current user role:', user?.role)
        console.log('🔒 Required roles: admin or serviceLeader')
      }

      if (activeTab === 'frequency') {
        console.log('🔄 Fetching frequency...')
        const response = await fetch(`${API_BASE_URL}/advanced-statistics/attendance-frequency?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        console.log('🔄 Frequency response:', data)
        if (data.success) {
          setFrequencyData(data.data.frequencyByDate)
        } else {
          console.error('❌ Frequency error:', data.error)
        }
      }

      if (activeTab === 'individual' && selectedClass) {
        console.log('🎯 Fetching individual class:', selectedClass)
        const response = await fetch(`${API_BASE_URL}/advanced-statistics/individual-class/${selectedClass}?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        console.log('🎯 Individual response:', data)
        if (data.success) {
          setIndividualClassData(data.data)
        } else {
          console.error('❌ Individual error:', data.error)
        }
      }

    } catch (error) {
      console.error('❌ Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

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
            📊 الإحصائيات المتقدمة والتحليلات
          </h1>
          <p className="text-gray-600">
            {user?.role === 'admin' || user?.role === 'serviceLeader' 
              ? 'إحصائيات شاملة ومقارنات بين الفصول مع تحليل تكرار أخذ الحضور' 
              : 'إحصائيات متقدمة وتحليل مفصل لفصلك'}
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

            {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الفصل</label>
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
              </div>
            )}

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
            <nav className="-mb-px flex space-x-8 px-6" dir="ltr">
              <button
                onClick={() => setActiveTab('trends')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'trends'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📈 اتجاهات الحضور
              </button>

              {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'comparison'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ⚖️ مقارنة الفصول
                </button>
              )}

              <button
                onClick={() => setActiveTab('frequency')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'frequency'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔄 تكرار أخذ الحضور
              </button>

              <button
                onClick={() => setActiveTab('individual')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'individual'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎯 تحليل فصل محدد
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Trends Tab */}
            {activeTab === 'trends' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  📈 اتجاهات الحضور والغياب عبر الوقت
                </h3>
                <p className="text-gray-600 mb-6">
                  هذا القسم يوضح الفرق بين المرات التي أُخذ فيها الحضور والاتجاهات العامة للحضور والغياب
                </p>
                
                {trendsData.length > 0 ? (
                  <div className="space-y-8">
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
                            <div className="text-sm text-blue-700">أيام أُخذ فيها حضور</div>
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

                    {/* Data Table */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h4 className="text-lg font-semibold">📋 تفاصيل الحضور اليومي</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                التاريخ
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الحاضرون
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الغائبون
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الإجمالي
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                معدل الحضور
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {trendsData.map((item, index) => {
                              const attendanceRate = item.total > 0 ? (item.present / item.total) * 100 : 0
                              return (
                                <tr key={item.date} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatDate(item.date)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                    {item.present}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                                    {item.absent}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                                    {item.total}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAttendanceRateColor(attendanceRate)}`}>
                                      {Math.round(attendanceRate)}%
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
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

            {/* Class Comparison Tab */}
            {activeTab === 'comparison' && (user?.role === 'admin' || user?.role === 'serviceLeader') && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  ⚖️ مقارنة شاملة بين الفصول
                </h3>
                <p className="text-gray-600 mb-6">
                  لأمين الخدمة: إحصائيات كل فصل كاتيجوري مع عدد الحاضرين والغائبين والنسب المئوية
                </p>
                
                {classComparison.length > 0 ? (
                  <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-blue-100 mr-4">
                            <span className="text-2xl">🏫</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {classComparison.length}
                            </div>
                            <div className="text-sm text-blue-700">عدد الفصول</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-green-100 mr-4">
                            <span className="text-2xl">📈</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {Math.round((classComparison.reduce((sum, item) => sum + item.attendanceRate, 0) / Math.max(classComparison.length, 1)) * 100) / 100}%
                            </div>
                            <div className="text-sm text-green-700">متوسط معدل الحضور</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-purple-100 mr-4">
                            <span className="text-2xl">👥</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">
                              {classComparison.reduce((sum, item) => sum + item.presentCount, 0)}
                            </div>
                            <div className="text-sm text-purple-700">إجمالي الحضور</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-orange-100 mr-4">
                            <span className="text-2xl">👶</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-orange-600">
                              {classComparison.reduce((sum, item) => sum + item.totalChildren, 0)}
                            </div>
                            <div className="text-sm text-orange-700">إجمالي الأطفال</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h4 className="text-lg font-semibold">📊 تفاصيل مقارنة الفصول</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الفصل
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                الفئة
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                عدد الأطفال
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                عدد الجلسات
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                إجمالي الحضور
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                إجمالي الغياب
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                معدل الحضور
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                متوسط الحضور/جلسة
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {classComparison.map((classItem, index) => (
                              <tr key={classItem.classId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  <div className="flex items-center">
                                    <span className="p-1 rounded-full bg-blue-100 text-blue-600 mr-2">🏫</span>
                                    {classItem.className}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    {classItem.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                                  {classItem.totalChildren}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                                  {classItem.totalSessions}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                  {classItem.presentCount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                                  {classItem.absentCount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAttendanceRateColor(classItem.attendanceRate)}`}>
                                    {classItem.attendanceRate}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                                  {classItem.avgAttendancePerSession}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">⚖️</div>
                    <p className="text-gray-600">لا توجد بيانات للمقارنة</p>
                    <p className="text-sm text-gray-500 mt-2">تأكد من وجود بيانات حضور للفترة المحددة</p>
                  </div>
                )}
              </div>
            )}

            {/* Frequency Tab */}
            {activeTab === 'frequency' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  🔄 تحليل تكرار أخذ الحضور
                </h3>
                <p className="text-gray-600 mb-6">
                  هذا القسم يوضح الفرق بين المرات التي أُخذ فيها الحضور وتكرار النشاط لكل يوم
                </p>
                
                {frequencyData.length > 0 ? (
                  <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-blue-100 mr-4">
                            <span className="text-2xl">📅</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {frequencyData.length}
                            </div>
                            <div className="text-sm text-blue-700">أيام أُخذ فيها حضور</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-green-100 mr-4">
                            <span className="text-2xl">🏫</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {Math.round((frequencyData.reduce((sum, item) => sum + item.classesWithAttendance, 0) / Math.max(frequencyData.length, 1)) * 100) / 100}
                            </div>
                            <div className="text-sm text-green-700">متوسط الفصول/يوم</div>
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
                              {frequencyData.reduce((sum, item) => sum + item.totalAttendanceRecords, 0)}
                            </div>
                            <div className="text-sm text-purple-700">إجمالي السجلات</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h4 className="text-lg font-semibold">📋 تفاصيل تكرار الحضور اليومي</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                التاريخ
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                عدد الفصول النشطة
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                إجمالي السجلات
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                متوسط السجلات/فصل
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {frequencyData.map((item, index) => {
                              const avgRecordsPerClass = item.classesWithAttendance > 0 ? 
                                Math.round((item.totalAttendanceRecords / item.classesWithAttendance) * 100) / 100 : 0
                              return (
                                <tr key={item.date} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatDate(item.date)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                                    {item.classesWithAttendance}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold">
                                    {item.totalAttendanceRecords}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                    {avgRecordsPerClass}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🔄</div>
                    <p className="text-gray-600">لا توجد بيانات تكرار للفترة المحددة</p>
                    <p className="text-sm text-gray-500 mt-2">جرب تغيير الفترة الزمنية أو الفصل المحدد</p>
                  </div>
                )}
              </div>
            )}

            {/* Individual Class Tab */}
            {activeTab === 'individual' && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  🎯 تحليل مفصل لفصل محدد
                </h3>
                <p className="text-gray-600 mb-6">
                  تحليل شامل لفصل واحد مع تفاصيل حضور كل طفل وإحصائيات مفصلة
                </p>
                
                {!selectedClass ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🎯</div>
                    <p className="text-gray-600">يرجى اختيار فصل للتحليل المفصل</p>
                    <p className="text-sm text-gray-500 mt-2">استخدم القائمة المنسدلة أعلاه لاختيار الفصل</p>
                  </div>
                ) : individualClassData ? (
                  <div className="space-y-8">
                    {/* Class Info */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
                      <h4 className="text-2xl font-bold mb-4 flex items-center">
                        <span className="mr-3">🏫</span>
                        {individualClassData.classInfo.name}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-blue-100">الفئة</div>
                          <div className="font-semibold text-lg">{individualClassData.classInfo.category}</div>
                        </div>
                        <div>
                          <div className="text-blue-100">عدد الأطفال</div>
                          <div className="font-semibold text-lg">{individualClassData.classInfo.totalChildren}</div>
                        </div>
                        <div>
                          <div className="text-blue-100">عدد الجلسات</div>
                          <div className="font-semibold text-lg">{individualClassData.period.totalSessions}</div>
                        </div>
                        <div>
                          <div className="text-blue-100">معدل الحضور الإجمالي</div>
                          <div className="font-semibold text-lg">{individualClassData.overallStats.attendanceRate}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Overall Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-green-100 mr-4">
                            <span className="text-2xl">✅</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {individualClassData.overallStats.presentTotal}
                            </div>
                            <div className="text-sm text-green-700">إجمالي مرات الحضور</div>
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
                              {individualClassData.overallStats.absentTotal}
                            </div>
                            <div className="text-sm text-red-700">إجمالي مرات الغياب</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-blue-100 mr-4">
                            <span className="text-2xl">📊</span>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {Math.round(individualClassData.overallStats.avgAttendancePerSession * 100) / 100}
                            </div>
                            <div className="text-sm text-blue-700">متوسط الحضور/جلسة</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Children Analysis Table */}
                    {individualClassData.childrenAnalysis && individualClassData.childrenAnalysis.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                          <h4 className="text-lg font-semibold">👥 تفاصيل حضور الأطفال</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  اسم الطفل
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  مرات الحضور
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  مرات الغياب
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  معدل الحضور
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  الغياب المتتالي
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  آخر حضور
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {individualClassData.childrenAnalysis
                                .sort((a: any, b: any) => b.attendanceRate - a.attendanceRate)
                                .map((child: any, index: number) => (
                                <tr key={child.childId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    <div className="flex items-center">
                                      <span className="p-1 rounded-full bg-blue-100 text-blue-600 mr-2">👶</span>
                                      {child.name}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                    {child.presentCount}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                                    {child.absentCount}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAttendanceRateColor(child.attendanceRate)}`}>
                                      {Math.round(child.attendanceRate)}%
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {child.consecutiveAbsent > 0 ? (
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        child.consecutiveAbsent >= 3 
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {child.consecutiveAbsent} مرات
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">لا يوجد</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {child.lastAttendance ? 
                                      formatDate(child.lastAttendance) : 
                                      <span className="text-red-500">لم يحضر</span>
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📊</div>
                    <p className="text-gray-600">لا توجد بيانات للفصل المحدد</p>
                    <p className="text-sm text-gray-500 mt-2">تأكد من وجود بيانات حضور للفصل والفترة المحددة</p>
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
