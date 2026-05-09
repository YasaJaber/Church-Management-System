'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  CakeIcon,
  UserGroupIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  GiftIcon,
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { childrenAPI } from '@/services/api'

interface BirthdayChild {
  _id: string
  name: string
  birthDate: string
  age: number
  phone?: string
  image?: string | null
  thumbnail?: string | null
  className?: string
}

interface ClassBirthdays {
  class: {
    _id: string
    name: string
  }
  children: BirthdayChild[]
}

interface BirthdayData {
  data: ClassBirthdays[]
  totalBirthdays: number
  weekRange: {
    from: string
    to: string
  }
  nextFriday: string
}

export default function BirthdaysPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [birthdayData, setBirthdayData] = useState<BirthdayData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated && user) {
      if (user.role === 'admin' || user.role === 'serviceLeader' ||
          user.role === 'classTeacher' || user.role === 'servant') {
        loadBirthdays()
      } else {
        toast.error('ليس لديك صلاحية للوصول لهذه الصفحة')
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  const loadBirthdays = async () => {
    setLoading(true)
    try {
      const response = await childrenAPI.getBirthdays()

      if (response.success) {
        setBirthdayData(response)
      } else {
        toast.error(response.error || 'فشل في تحميل أعياد الميلاد')
      }
    } catch (error) {
      console.error('Error loading birthdays:', error)
      toast.error('حدث خطأ في تحميل أعياد الميلاد')
    } finally {
      setLoading(false)
    }
  }

  // Format date from YYYY-MM-DD to Arabic readable format
  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-')
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      return date.toLocaleDateString('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    } catch {
      return dateStr
    }
  }

  // Format the week range
  const formatWeekRange = (from: string, to: string) => {
    return `${formatDate(from)} - ${formatDate(to)}`
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">جاري تحميل أعياد الميلاد...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const totalBirthdays = birthdayData?.totalBirthdays || 0
  const classGroups = birthdayData?.data || []
  const weekRange = birthdayData?.weekRange
  const nextFriday = birthdayData?.nextFriday

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
                🎂 أعياد الميلاد
                {user?.assignedClass && (
                  <span className="text-blue-600 font-medium text-base"> - {user.assignedClass.name}</span>
                )}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Info Banner */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <CakeIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">أعياد ميلاد الأسبوع 🎉</h2>
                {weekRange && (
                  <p className="text-pink-100 text-sm mt-1">
                    <CalendarIcon className="w-4 h-4 inline ml-1" />
                    {formatWeekRange(weekRange.from, weekRange.to)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center bg-white bg-opacity-20 rounded-lg px-4 py-2">
                <div className="text-3xl font-bold">{totalBirthdays}</div>
                <div className="text-xs text-pink-100">عيد ميلاد</div>
              </div>
              {nextFriday && (
                <div className="text-center bg-white bg-opacity-20 rounded-lg px-4 py-2">
                  <div className="text-sm font-semibold">🕌 الجمعة القادمة</div>
                  <div className="text-xs text-pink-100">{formatDate(nextFriday)}</div>
                </div>
              )}
            </div>
          </div>
          <p className="text-pink-100 text-sm mt-3 text-center sm:text-right">
            ✨ هؤلاء الأطفال عيد ميلادهم خلال هذا الأسبوع - سيتم الاحتفال بهم يوم الجمعة
          </p>
        </div>

        {/* Birthday Cards */}
        {totalBirthdays === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <CakeIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              لا توجد أعياد ميلاد هذا الأسبوع
            </h3>
            <p className="text-gray-500">
              لم يتم العثور على أطفال عيد ميلادهم في الفترة من{' '}
              {weekRange ? formatWeekRange(weekRange.from, weekRange.to) : ''}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              تأكد من إضافة تاريخ الميلاد لكل طفل في قسم إدارة الأطفال
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {classGroups.map((group) => (
              <div key={group.class._id} className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Class Header */}
                <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserGroupIcon className="w-6 h-6" />
                      <h3 className="text-lg font-semibold">{group.class.name}</h3>
                    </div>
                    <span className="bg-white bg-opacity-25 px-3 py-1 rounded-full text-sm font-medium">
                      🎂 {group.children.length} {group.children.length === 1 ? 'عيد ميلاد' : 'أعياد ميلاد'}
                    </span>
                  </div>
                </div>

                {/* Children Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.children.map((child) => (
                      <div
                        key={child._id}
                        className="relative border-2 border-pink-100 rounded-xl p-5 hover:shadow-lg transition-all duration-300 hover:border-pink-300 bg-gradient-to-br from-white to-pink-50"
                      >
                        {/* Birthday Confetti decoration */}
                        <div className="absolute top-2 left-2 text-2xl animate-bounce">🎈</div>
                        <div className="absolute top-2 right-2 text-2xl animate-bounce" style={{animationDelay: '0.3s'}}>🎉</div>

                        <div className="flex items-center gap-4 mb-4 mt-2">
                          {/* Avatar */}
                          {child.thumbnail || child.image ? (
                            <img
                              src={child.thumbnail || child.image || ''}
                              alt={child.name}
                              className="w-14 h-14 rounded-full object-cover border-3 border-pink-200 shadow-md"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center border-3 border-pink-200 shadow-md">
                              <UserIcon className="w-7 h-7 text-pink-500" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-base truncate">{child.name}</h4>
                            <div className="flex items-center gap-1 mt-1">
                              <GiftIcon className="w-4 h-4 text-pink-500" />
                              <span className="text-sm font-semibold text-pink-600">
                                {child.age} سنة
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Birthday Date */}
                        <div className="bg-pink-50 border border-pink-100 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-pink-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 font-medium">
                              {formatDate(child.birthDate)}
                            </span>
                          </div>
                        </div>

                        {/* Phone */}
                        {child.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <PhoneIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <a
                              href={`tel:${child.phone}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              dir="ltr"
                            >
                              {child.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Note */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <h4 className="font-semibold text-amber-800 mb-1">ملاحظة</h4>
              <p className="text-sm text-amber-700">
                يتم عرض الأطفال الذين عيد ميلادهم خلال الأسبوع الحالي (من السبت للجمعة) لنحتفل بهم يوم الجمعة في الكنيسة.
                تأكد من إضافة تاريخ الميلاد لكل طفل في صفحة{' '}
                <button
                  onClick={() => router.push('/children')}
                  className="text-amber-900 font-semibold underline hover:text-amber-700"
                >
                  إدارة الأطفال
                </button>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
