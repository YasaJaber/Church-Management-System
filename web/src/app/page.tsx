'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mb-4">
            <img 
              src="/saint-george.png" 
              alt="كنيسة مار جرجس" 
              className="w-32 h-32 mx-auto rounded-lg shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            كنيسة الشهيد مار جرجس - بأولاد علي
          </h1>
          <p className="text-gray-600 mb-6">
            نظام إدارة الكنيسة
          </p>
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500 mt-4">
            جاري تحميل النظام...
          </p>
        </div>
      </div>
    )
  }

  return null
}
