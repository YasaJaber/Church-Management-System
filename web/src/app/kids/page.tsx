'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AddKidForm from '@/components/AddKidForm'
import KidCard from '@/components/KidCard'
import { kidsAPI } from '@/services/api'

interface Kid {
  _id: string
  name: string
  phone?: string
  notes?: string
  image?: string | null
  thumbnail?: string | null
  optimizedImage?: string | null
}

export default function KidsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [kids, setKids] = useState<Kid[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      loadKids()
    }
  }, [isAuthenticated, isLoading, router])

  const loadKids = async () => {
    setLoading(true)
    try {
      const response = await kidsAPI.getAll()

      if (response.success) {
        setKids(response.data || [])
      } else {
        toast.error(response.error || 'فشل في تحميل بيانات الأطفال')
      }
    } catch (error) {
      console.error('Error loading kids:', error)
      toast.error('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSuccess = (newKid: Kid) => {
    setKids((prev) => [newKid, ...prev])
    setShowAddModal(false)
  }

  const handleDelete = async (kidId: string) => {
    const kidToDelete = kids.find((k) => k._id === kidId)
    if (!kidToDelete) return

    const confirmMessage = `هل أنت متأكد من حذف "${kidToDelete.name}"؟`
    if (!confirm(confirmMessage)) return

    try {
      const response = await kidsAPI.delete(kidId)

      if (response.success) {
        setKids((prev) => prev.filter((k) => k._id !== kidId))
        toast.success('تم حذف الطفل بنجاح')
      } else {
        toast.error(response.error || 'فشل في حذف الطفل')
      }
    } catch (error) {
      console.error('Error deleting kid:', error)
      toast.error('حدث خطأ في حذف الطفل')
    }
  }

  // Filter kids based on search
  const filteredKids = kids.filter((kid) =>
    kid.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-4"
              >
                ← العودة
              </button>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                إدارة الأطفال (مع الصور)
              </h1>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline">إضافة طفل</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="البحث بالاسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <UserGroupIcon className="w-5 h-5" />
              <span>
                {filteredKids.length} طفل
                {searchTerm && ` (من ${kids.length})`}
              </span>
            </div>
          </div>
        </div>

        {/* Kids Grid */}
        {filteredKids.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'لا توجد نتائج' : 'لا يوجد أطفال مسجلين'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm
                ? 'جرب البحث بكلمة أخرى'
                : 'ابدأ بإضافة طفل جديد باستخدام الزر أعلاه'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                إضافة طفل جديد
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredKids.map((kid) => (
              <KidCard
                key={kid._id}
                kid={kid}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Kid Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                إضافة طفل جديد
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <AddKidForm
                onSuccess={handleAddSuccess}
                onCancel={() => setShowAddModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
