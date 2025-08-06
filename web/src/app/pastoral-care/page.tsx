'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect } from 'react'
import { pastoralCareAPI } from '@/services/api'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  PhoneIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface AbsentChild {
  _id: string
  name: string
  phone: string | null
  parentName: string
  className: string
  class: {
    _id: string
    name: string
    stage: string
    grade: string
  } | null
  pastoralCareId: string | null
  hasBeenCalled: boolean
  calledBy: string | null
  calledAt: string | null
  lastAbsentDate: string
  notes: string
  addedDate: string | null
}

interface ApiResponse {
  success: boolean
  data: AbsentChild[]
  date: string
  totalAbsent: number
  totalChildren: number
  message: string
}

export default function PastoralCarePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [absentChildren, setAbsentChildren] = useState<AbsentChild[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // all, called, notCalled
  const [lastAbsentDate, setLastAbsentDate] = useState('')
  const [totalStats, setTotalStats] = useState({ totalAbsent: 0, totalChildren: 0 })
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    // التحقق من الصلاحيات - فقط أمين الخدمة ومدرس الفصل والإداري
    if (isAuthenticated && user) {
      if (user.role === 'serviceLeader' || user.role === 'classTeacher' || user.role === 'admin') {
        loadAbsentChildren()
      } else {
        toast.error('ليس لديك صلاحية للوصول لهذه الصفحة')
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  const loadAbsentChildren = async () => {
    setLoading(true)
    try {
      const response: ApiResponse = await pastoralCareAPI.getAbsentChildren()
      
      if (response.success) {
        setAbsentChildren(response.data || [])
        setLastAbsentDate(response.date || '')
        setTotalStats({
          totalAbsent: response.totalAbsent || 0,
          totalChildren: response.totalChildren || 0
        })
        
        // استخراج الفصول الفريدة للفلتر
        const classes = response.data
          ?.map(child => child.className)
          .filter((className, index, array) => array.indexOf(className) === index)
          .sort() || []
        setUniqueClasses(classes)
      } else {
        toast.error(response.message || 'فشل في تحميل قائمة الافتقاد')
      }
    } catch (error) {
      console.error('Error loading absent children:', error)
      toast.error('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneCall = async (child: AbsentChild) => {
    if (!child.phone) {
      toast.error('لا يوجد رقم هاتف مسجل لهذا الطفل')
      return
    }

    // فتح رابط الاتصال
    const phoneNumber = child.phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '')
    window.open(`tel:${phoneNumber}`, '_self')
    
    // تسجيل أنه تم الاتصال
    try {
      const response = await pastoralCareAPI.markChildCalled(child._id, `تم الاتصال بـ ${child.parentName}`)
      if (response.success) {
        toast.success(`تم تسجيل الاتصال بـ ${child.name}`)
        loadAbsentChildren() // إعادة تحميل القائمة
      }
    } catch (error) {
      console.error('Error marking child as called:', error)
      // لا نعرض خطأ هنا لأن الاتصال تم بالفعل
    }
  }

  const handleRemoveFromList = async (child: AbsentChild) => {
    if (!confirm(`هل أنت متأكد من إزالة ${child.name} من قائمة الافتقاد؟`)) {
      return
    }

    try {
      const response = await pastoralCareAPI.removeChildFromCare(
        child._id, 
        'تم الانتهاء من افتقاد الطفل'
      )
      
      if (response.success) {
        toast.success(`تم إزالة ${child.name} من قائمة الافتقاد`)
        loadAbsentChildren() // إعادة تحميل القائمة
      } else {
        toast.error('فشل في إزالة الطفل من القائمة')
      }
    } catch (error) {
      console.error('Error removing child from list:', error)
      toast.error('حدث خطأ في إزالة الطفل من القائمة')
    }
  }

  // فلترة الأطفال حسب البحث والفلاتر
  const filteredChildren = absentChildren.filter(child => {
    const matchesSearch = child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         child.parentName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesClass = classFilter === 'all' || child.className === classFilter
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'called' && child.hasBeenCalled) ||
                         (statusFilter === 'notCalled' && !child.hasBeenCalled)
    
    return matchesSearch && matchesClass && matchesStatus
  })

  // إحصائيات سريعة
  const getQuickStats = () => {
    const total = filteredChildren.length
    const called = filteredChildren.filter(child => child.hasBeenCalled).length
    const notCalled = total - called
    
    return { total, called, notCalled }
  }

  const quickStats = getQuickStats()

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">جاري تحميل قائمة الافتقاد...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 ml-4 flex-shrink-0"
              >
                ← العودة
              </button>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                الافتقاد
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={loadAbsentChildren}
                className="flex items-center px-2 sm:px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm whitespace-nowrap"
                title="تحديث القائمة"
              >
                <ArrowPathIcon className="w-4 h-4 ml-1" />
                <span className="hidden sm:inline">تحديث</span>
              </button>
              <div className="flex items-center">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 ml-1 sm:ml-2" />
                <span className="text-sm text-gray-600">
                  {quickStats.total} طفل يحتاج افتقاد
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Last Absent Date Info */}
        {lastAbsentDate && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <CalendarDaysIcon className="w-5 h-5 text-blue-600 ml-2" />
              <p className="text-blue-800 font-medium">
                آخر موعد حضور: {new Date(lastAbsentDate).toLocaleDateString('ar-EG', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm text-gray-600">إجمالي الغياب</p>
                <p className="text-2xl font-bold text-red-700">{totalStats.totalAbsent}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="bg-orange-100 p-3 rounded-full">
                <UserGroupIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm text-gray-600">يحتاج افتقاد</p>
                <p className="text-2xl font-bold text-orange-700">{quickStats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm text-gray-600">تم الاتصال</p>
                <p className="text-2xl font-bold text-green-700">{quickStats.called}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full">
                <PhoneIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm text-gray-600">لم يتم الاتصال</p>
                <p className="text-2xl font-bold text-yellow-700">{quickStats.notCalled}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="البحث عن طفل أو ولي أمر..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="فلتر حسب الفصل"
              >
                <option value="all">جميع الفصول</option>
                {uniqueClasses.map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="فلتر حسب حالة الاتصال"
              >
                <option value="all">جميع الحالات</option>
                <option value="notCalled">لم يتم الاتصال</option>
                <option value="called">تم الاتصال</option>
              </select>
            </div>
          </div>
        </div>

        {/* Children List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredChildren.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">لا توجد أطفال تحتاج للافتقاد</p>
              <p className="text-gray-400 text-sm mt-1">
                {statusFilter === 'all' ? 'جميع الأطفال الغائبين تم افتقادهم' : 
                 statusFilter === 'called' ? 'لا توجد أطفال تم الاتصال بهم' :
                 'لا توجد أطفال لم يتم الاتصال بهم'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredChildren.map((child) => (
                <div key={child._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-medium text-gray-900 ml-3">
                          {child.name}
                        </h3>
                        {child.hasBeenCalled && (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            <CheckCircleIcon className="w-3 h-3 ml-1" />
                            تم الاتصال
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <UserGroupIcon className="w-4 h-4 ml-1" />
                          <span>ولي الأمر: {child.parentName}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
                          <span>الفصل: {child.className}</span>
                        </div>
                        {child.phone && (
                          <div className="flex items-center">
                            <PhoneIcon className="w-4 h-4 ml-1" />
                            <span dir="ltr">{child.phone}</span>
                          </div>
                        )}
                      </div>

                      {child.hasBeenCalled && child.calledAt && (
                        <div className="mt-2 text-xs text-gray-500">
                          <ClockIcon className="w-3 h-3 inline ml-1" />
                          تم الاتصال في: {new Date(child.calledAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}

                      {child.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">ملاحظات: </span>
                          {child.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mr-4">
                      {/* زر الاتصال */}
                      <button
                        onClick={() => handlePhoneCall(child)}
                        disabled={!child.phone}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          child.phone
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={child.phone ? `اتصال بـ ${child.phone}` : 'لا يوجد رقم هاتف'}
                      >
                        <PhoneIcon className="w-4 h-4 ml-1" />
                        اتصال
                      </button>

                      {/* زر الإزالة من القائمة */}
                      <button
                        onClick={() => handleRemoveFromList(child)}
                        className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
                        title="تم الانتهاء من الافتقاد"
                      >
                        <CheckCircleIcon className="w-4 h-4 ml-1" />
                        تم
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary at bottom */}
        {filteredChildren.length > 0 && (
          <div className="mt-6 bg-gray-50 border rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                عرض {filteredChildren.length} من {absentChildren.length} طفل
              </span>
              <span>
                تم الاتصال: {quickStats.called} | لم يتم الاتصال: {quickStats.notCalled}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
