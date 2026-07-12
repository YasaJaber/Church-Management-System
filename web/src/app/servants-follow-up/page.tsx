'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/services/api'
import PageBackButton from '@/components/ui/PageBackButton'

interface ServantFollowUp {
  _id: string
  name: string
  phone: string
  lastAbsenceDate: string
  lastPresentDate: string | null
  status: string
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
      const statsResponse = await fetch(`${API_BASE_URL}/servants/statistics/general`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setServantStats(statsData.data)
        }
      }
      
      // جلب الخدام الذين يحتاجون متابعة
      const followUpResponse = await fetch(`${API_BASE_URL}/servants/statistics/follow-up`, {
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
    } catch (error: unknown) {
      console.error('Error fetching servants data:', error)
      setError((error as Error).message || 'حدث خطأ في جلب البيانات')
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

  const handleWhatsApp = (phone: string) => {
    if (phone) {
      // Clean phone number and add Egypt country code +20
      const cleanPhone = phone.replace(/[^0-9]/g, '')
      const phoneWithCountryCode = '+20' + cleanPhone
      window.open(`https://wa.me/${phoneWithCountryCode}`, '_blank')
    }
  }

  const handleFollowUpComplete = async (servantId: string, servantName: string) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      const response = await fetch(`${API_BASE_URL}/servants/follow-up/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          servantId,
          notes: `تم افتقاد ${servantName}`
        })
      })

      if (response.ok) {
        // Remove servant from the list immediately
        setServantsNeedingFollowUp(prev => 
          prev.filter(servant => servant._id !== servantId)
        )
        
        // Show success message
        alert(`تم تسجيل افتقاد ${servantName} بنجاح`)
      } else {
        alert('حدث خطأ في تسجيل الافتقاد')
      }
    } catch (error) {
      console.error('Error completing follow-up:', error)
      alert('حدث خطأ في تسجيل الافتقاد')
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'absent':
        return { label: 'غائب', color: 'bg-red-100 text-red-800' }
      case 'no_record':
        return { label: 'لا يوجد سجل', color: 'bg-yellow-100 text-yellow-800' }
      default:
        return { label: 'يحتاج متابعة', color: 'bg-orange-100 text-orange-800' }
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
        <PageBackButton className="mb-3" />
        <h1 className="text-3xl font-bold text-gray-900 text-right">متابعة الخدام</h1>
        <p className="text-gray-600 text-right mt-2">الخدام الذين غابوا في آخر جمعة ويحتاجون للافتقاد</p>
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
          <h2 className="text-xl font-bold text-gray-900 text-right">الخدام المحتاجين افتقاد</h2>
          <p className="text-sm text-gray-600 text-right mt-1">الخدام الذين غابوا في آخر يوم جمعة</p>
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
                    تاريخ الغياب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    آخر حضور
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {servantsNeedingFollowUp.map((servant) => {
                  const statusInfo = getStatusLabel(servant.status)
                  
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
                        <div className="text-sm text-gray-900">
                          {formatDate(servant.lastAbsenceDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {formatDate(servant.lastPresentDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
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
                            onClick={() => handleWhatsApp(servant.phone)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                            title="واتساب"
                          >
                            💬 واتساب
                          </button>
                          <button
                            onClick={() => handleFollowUpComplete(servant._id, servant.name)}
                            className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700 transition-colors"
                            title="تم الافتقاد"
                          >
                            ✅ تم الافتقاد
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
            <p className="text-green-600 text-lg font-medium">ممتاز! لا يوجد خدام محتاجين افتقاد</p>
            <p className="text-gray-500 text-sm mt-2">جميع الخدام حضروا في آخر جمعة</p>
          </div>
        )}
      </div>

      {/* نصائح للافتقاد */}
      {servantsNeedingFollowUp.length > 0 && (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-8">
          <h3 className="text-lg font-bold text-blue-900 mb-4 text-right">نصائح للافتقاد</h3>
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
                <li>• تأكد من حضوره الجمعة القادمة</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-blue-800 text-sm">💡 بعد الافتقاد، اضغط &quot;تم الافتقاد&quot; لإزالة الخادم من القائمة</p>
          </div>
        </div>
      )}
    </div>
  )
}
