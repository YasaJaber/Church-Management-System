'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/services/api'
import PageBackButton from '@/components/ui/PageBackButton'

interface ConsecutiveServant {
  servantId: string
  name: string
  username: string
  role: string
  assignedClass: string
  consecutiveWeeks: number
}

interface WeeklyAttendance {
  date: string
  totalServants: number
  presentCount: number
  attendanceRate: number
}

export default function ServantsConsecutiveAttendancePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [servantsData, setServantsData] = useState<ConsecutiveServant[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deliveryLoading, setDeliveryLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    if (isAuthenticated && user) {
      // أمين الخدمة والأدمن فقط
      if (user.role !== 'admin' && user.role !== 'serviceLeader') {
        router.push('/statistics')
        return
      }
      
      initializePage()
    }
  }, [isAuthenticated, isLoading, router, user])

  const initializePage = async () => {
    await Promise.all([
      fetchConsecutiveAttendance(),
      fetchWeeklyData()
    ])
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const fetchConsecutiveAttendance = async () => {
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      if (!token) {
        setError('يرجى تسجيل الدخول أولاً')
        return
      }
      
      const url = `${API_BASE_URL}/servants-attendance/consecutive-attendance?minDays=4`
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
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response error:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('📊 API Response:', data)
      
      if (data.success) {
        setServantsData(data.data || [])
        console.log('✅ Servants data set:', data.data?.length || 0, 'servants')
      } else {
        setError(data.error || 'حدث خطأ في جلب البيانات')
        console.error('❌ API Error:', data.error)
      }
    } catch (error: any) {
      console.error('❌ Error fetching consecutive attendance:', error)
      setError(error.message || 'حدث خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklyData = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      const url = `${API_BASE_URL}/servants-attendance/weekly-stats`
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.data) {
          setWeeklyData(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching weekly data:', error)
    }
  }

  const handleDeliverGift = async (servantId: string, servantName: string) => {
    if (!confirm(`هل أنت متأكد من تسليم المكافأة لـ ${servantName}؟\n\nسيتم إعادة تعيين عداد المواظبة للخادم.`)) {
      return
    }

    try {
      setDeliveryLoading(servantId)
      
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      const response = await fetch(`${API_BASE_URL}/servants-attendance/deliver-gift`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ servantId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`🎁 ${data.message}`)
        await fetchConsecutiveAttendance()
      } else {
        alert(`❌ خطأ: ${data.error}`)
      }
    } catch (error: any) {
      console.error('Error delivering gift:', error)
      alert(`❌ حدث خطأ في تسليم المكافأة: ${error.message}`)
    } finally {
      setDeliveryLoading(null)
    }
  }

  const handleResetConsecutive = async () => {
    const confirmed = window.confirm(
      '⚠️ هل أنت متأكد من إعادة تعيين المواظبة؟\n\n' +
      'سيتم إعادة تعيين عداد المواظبة لجميع الخدام وسيبدأ العد من الصفر.\n\n' +
      'هذا الإجراء مناسب بعد توزيع المكافآت لبدء دورة جديدة.'
    )

    if (!confirmed) return

    try {
      setLoading(true)
      
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      if (!token) {
        alert('يرجى تسجيل الدخول أولاً')
        return
      }

      const response = await fetch(`${API_BASE_URL}/servants-attendance/reset-consecutive`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ ${data.message}\n\n🎉 تم بدء دورة مواظبة جديدة!`)
        await fetchConsecutiveAttendance()
      } else {
        alert(`❌ خطأ: ${data.error}`)
      }
    } catch (error: any) {
      console.error('Error resetting:', error)
      alert(`❌ حدث خطأ: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading && servantsData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">جاري تحميل بيانات المواظبة...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">خطأ</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-xl">
                <span className="text-4xl">👥</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-800">
                  مواظبة الخدام المتتالية
                </h1>
                <p className="text-gray-600 mt-2">
                  الخدام الذين حافظوا على الحضور لمدة 4 أسابيع متتالية أو أكثر
                </p>
              </div>
            </div>
            <PageBackButton href="/service-leader-dashboard" />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">إجمالي الخدام المواظبين</p>
                  <p className="text-4xl font-bold mt-2">{servantsData.length}</p>
                </div>
                <div className="text-5xl opacity-80">🏆</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">أعلى مواظبة</p>
                  <p className="text-4xl font-bold mt-2">
                    {servantsData.length > 0 ? servantsData[0].consecutiveWeeks : 0} أسبوع
                  </p>
                </div>
                <div className="text-5xl opacity-80">📊</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">متوسط المواظبة</p>
                  <p className="text-4xl font-bold mt-2">
                    {servantsData.length > 0 
                      ? Math.round(servantsData.reduce((sum, s) => sum + s.consecutiveWeeks, 0) / servantsData.length)
                      : 0} أسبوع
                  </p>
                </div>
                <div className="text-5xl opacity-80">⭐</div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Statistics - Last 4 Sessions */}
        {weeklyData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              📈 آخر 4 مرات تم تسجيل الحضور فيها
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              📝 ملاحظة: هذه ليست بالضرورة أيام جمعة - بل آخر 4 مرات تم تسجيل الحضور فيها
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {weeklyData.map((week, index) => (
                <div 
                  key={index}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200"
                >
                  <p className="text-sm text-gray-600 mb-2">
                    {formatDate(week.date)}
                  </p>
                  <p className="text-3xl font-bold text-indigo-600 mb-2">
                    {week.attendanceRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    {week.presentCount} / {week.totalServants} خادم
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${week.attendanceRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">إجراءات</h3>
              <p className="text-gray-600 text-sm mt-1">
                إدارة دورة المواظبة والمكافآت
              </p>
            </div>
            <button
              onClick={handleResetConsecutive}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-600 transition shadow-lg flex items-center gap-2"
            >
              <span className="text-xl">🔄</span>
              <span>إعادة تعيين المواظبة لجميع الخدام</span>
            </button>
          </div>
        </div>

        {/* Servants List */}
        {servantsData.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              🏆 قائمة الخدام المواظبين
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الترتيب
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      اسم الخادم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الدور
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عدد أسابيع المواظبة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التقدير
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تسليم المكافأة
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {servantsData.map((servant, index) => (
                    <tr key={servant.servantId} className="hover:bg-gray-50">
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
                        <div className="text-sm font-medium text-gray-900">
                          {servant.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {servant.role === 'servant' ? 'خادم' : 'مدرس فصل'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end">
                          <div className="text-sm font-medium text-gray-900 mr-2">
                            {servant.consecutiveWeeks} أسبوع
                          </div>
                          <div className="w-12 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full" 
                              style={{ width: `${Math.min((servant.consecutiveWeeks / 8) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          servant.consecutiveWeeks >= 8 ? 'bg-green-100 text-green-800' :
                          servant.consecutiveWeeks >= 6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {servant.consecutiveWeeks >= 8 ? 'ممتاز ⭐' :
                           servant.consecutiveWeeks >= 6 ? 'جيد جداً 👍' :
                           'جيد 👌'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeliverGift(servant.servantId, servant.name)}
                          disabled={deliveryLoading === servant.servantId}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium flex items-center gap-2"
                        >
                          {deliveryLoading === servant.servantId ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              جاري التسليم...
                            </>
                          ) : (
                            <>
                              🎁 تسليم المكافأة
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
        ) : !loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-8xl mb-6">📊</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-4">
              لا يوجد خدام بمواظبة 4 أسابيع متتالية حالياً
            </h3>
            <p className="text-gray-600 mb-4">
              سيظهر الخدام هنا عندما يحافظون على الحضور لمدة 4 أسابيع متتالية
            </p>
            <button 
              onClick={() => fetchConsecutiveAttendance()}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
