'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

interface ServantFollowUp {
  _id: string
  name: string
  phone: string
  consecutiveAbsences: number
  lastPresentDate: string | null
}

interface ServantStats {
  totalServants: number
  presentToday: number
  attendanceRate: number
  averageAttendance: number
}

export default function ServantsFollowUpPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [servantsNeedingFollowUp, setServantsNeedingFollowUp] = useState<ServantFollowUp[]>([])
  const [servantStats, setServantStats] = useState<ServantStats>({
    totalServants: 0,
    presentToday: 0,
    attendanceRate: 0,
    averageAttendance: 0
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
      
      fetchData()
    }
  }, [isAuthenticated, isLoading, router, user])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      // جلب الإحصائيات العامة للخدام
      const statsResponse = await fetch('http://localhost:5000/api/servants/statistics/general', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setServantStats(statsData.data)
        }
      }
      
      // جلب الخدام الذين يحتاجون متابعة
      const followUpResponse = await fetch('http://localhost:5000/api/servants/statistics/follow-up', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!followUpResponse.ok) {
        throw new Error('فشل في جلب بيانات الخدام')
      }
      
      const followUpData = await followUpResponse.json()
      
      if (followUpData.success) {
        setServantsNeedingFollowUp(followUpData.data || [])
      } else {
        setError(followUpData.error || 'حدث خطأ في جلب البيانات')
      }
    } catch (error: any) {
      console.error('Error fetching servants data:', error)
      setError(error.message || 'حدث خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'لم يحضر مطلقاً'
    return new Date(dateString).toLocaleDateString('ar-EG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatPhoneNumber = (phone: string) => {
    // تنسيق رقم الهاتف للعرض
    if (!phone) return ''
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
  }

  const handleCallServant = (phone: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self')
    }
  }

  const getUrgencyLevel = (consecutiveAbsences: number) => {
    if (consecutiveAbsences >= 6) {
      return { label: 'عاجل جداً', color: 'bg-red-600', textColor: 'text-red-600' }
    } else if (consecutiveAbsences >= 4) {
      return { label: 'عاجل', color: 'bg-orange-500', textColor: 'text-orange-600' }
    } else {
      return { label: 'يحتاج متابعة', color: 'bg-yellow-500', textColor: 'text-yellow-600' }
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
        <h1 className="text-3xl font-bold text-gray-900 text-right">متابعة الخدام</h1>
        <p className="text-gray-600 text-right mt-2">الخدام الذين يحتاجون للمتابعة والاتصال بهم</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-right">
          {error}
        </div>
      )}

      {/* إحصائيات عامة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">👥</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{servantStats.totalServants}</div>
            <div className="text-sm text-gray-600">إجمالي الخدام</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">✅</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{servantStats.presentToday}</div>
            <div className="text-sm text-gray-600">الحاضرون اليوم</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">📊</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{servantStats.attendanceRate}%</div>
            <div className="text-sm text-gray-600">معدل الحضور</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">⚠️</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{servantsNeedingFollowUp.length}</div>
            <div className="text-sm text-gray-600">يحتاجون متابعة</div>
          </div>
        </div>
      </div>

      {/* تحديث البيانات */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center">
          <button
            onClick={fetchData}
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

      {/* قائمة الخدام الذين يحتاجون متابعة */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-gray-900 text-right">الخدام الذين يحتاجون متابعة</h2>
          <p className="text-sm text-gray-600 text-right mt-1">الخدام الذين غابوا 3 أسابيع متتالية أو أكثر</p>
        </div>

        {servantsNeedingFollowUp.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    اسم الخادم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رقم الهاتف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    أسابيع الغياب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    آخر حضور
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الأولوية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {servantsNeedingFollowUp.map((servant) => {
                  const urgency = getUrgencyLevel(servant.consecutiveAbsences)
                  
                  return (
                    <tr key={servant._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {servant.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900" dir="ltr">
                          {formatPhoneNumber(servant.phone)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end">
                          <span className="text-lg font-bold text-red-600 mr-2">
                            {servant.consecutiveAbsences}
                          </span>
                          <span className="text-sm text-gray-600">أسبوع</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {formatDate(servant.lastPresentDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          servant.consecutiveAbsences >= 6 
                            ? 'bg-red-100 text-red-800' 
                            : servant.consecutiveAbsences >= 4
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {urgency.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleCallServant(servant.phone)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                            title="اتصال"
                          >
                            📞 اتصال
                          </button>
                          <button
                            onClick={() => window.open(`https://wa.me/${servant.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                            title="واتساب"
                          >
                            💬 واتساب
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-green-400 text-6xl mb-4">✅</div>
            <p className="text-green-600 text-lg font-medium">ممتاز! لا يوجد خدام يحتاجون متابعة</p>
            <p className="text-gray-500 text-sm mt-2">جميع الخدام مواظبون على الحضور</p>
          </div>
        )}
      </div>

      {/* إحصائيات إضافية */}
      {servantsNeedingFollowUp.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-2">
                {servantsNeedingFollowUp.filter(s => s.consecutiveAbsences >= 6).length}
              </div>
              <div className="text-sm text-red-700">حالات عاجلة جداً (6+ أسابيع)</div>
            </div>
          </div>

          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {servantsNeedingFollowUp.filter(s => s.consecutiveAbsences >= 4 && s.consecutiveAbsences < 6).length}
              </div>
              <div className="text-sm text-orange-700">حالات عاجلة (4-5 أسابيع)</div>
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-2">
                {servantsNeedingFollowUp.filter(s => s.consecutiveAbsences === 3).length}
              </div>
              <div className="text-sm text-yellow-700">حالات تحتاج متابعة (3 أسابيع)</div>
            </div>
          </div>
        </div>
      )}

      {/* نصائح للمتابعة */}
      {servantsNeedingFollowUp.length > 0 && (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-8">
          <h3 className="text-lg font-bold text-blue-900 mb-4 text-right">نصائح للمتابعة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">📞 عند الاتصال:</h4>
              <ul className="space-y-1 text-right">
                <li>• اسأل عن أحواله وظروفه الشخصية</li>
                <li>• تأكد من عدم وجود مشاكل أو صعوبات</li>
                <li>• ذكّره بأهمية دوره في الخدمة</li>
                <li>• اعرض المساعدة إذا كان يحتاجها</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">💬 رسائل واتساب:</h4>
              <ul className="space-y-1 text-right">
                <li>• ابدأ بالسلام والاطمئنان</li>
                <li>• لا تظهر اللوم أو العتاب</li>
                <li>• اظهر الاشتياق لوجوده في الخدمة</li>
                <li>• أرسل روابط أو معلومات مفيدة</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
