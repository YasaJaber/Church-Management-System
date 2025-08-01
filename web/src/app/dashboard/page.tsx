'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

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
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              <span className="text-sm text-gray-700">
                مرحباً، {user.name || user.username}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
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
          <div className="bg-white p-6 rounded-lg shadow">
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
                    --
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
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
                    --
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">📚</span>
                </div>
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    الفصول
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    --
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
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
                    --
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
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
            onClick={() => router.push('/attendance')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">✅</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                تسجيل الحضور
              </h3>
              <p className="text-sm text-gray-500">
                تسجيل حضور الأطفال وإدارة الغياب
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push('/statistics')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">📊</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                الإحصائيات
              </h3>
              <p className="text-sm text-gray-500">
                عرض تقارير الحضور والإحصائيات
              </p>
            </div>
          </button>

          {/* إدارة الخدام - لأمين الخدمة فقط */}
          {(user.role === 'admin' || user.role === 'serviceLeader') && (
            <button
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

          {/* إدارة الفصول - لأمين الخدمة فقط */}
          {(user.role === 'admin' || user.role === 'serviceLeader') && (
            <button
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
            onClick={() => router.push('/pastoral-care')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer text-right"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">❤️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                الرعاية الرعوية
              </h3>
              <p className="text-sm text-gray-500">
                متابعة الحالات الخاصة والرعاية
              </p>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}
