'use client'

import React, { useEffect } from 'react'

// Force dynamic rendering to avoid SSR issues with html2pdf.js
export const dynamic = 'force-dynamic'
import { useAuth } from '@/context/AuthContextSimple'
import { ExportAttendanceTeacher } from '@/components/ExportAttendanceTeacher'
import { ExportAttendanceAdmin } from '@/components/ExportAttendanceAdmin'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Image from 'next/image'

export default function ExportAttendancePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image 
                src="/saint-george.png" 
                alt="كنيسة مار جرجس"
                width={32}
                height={32}
                className="ml-3 rounded"
              />
              <h1 className="text-xl font-semibold text-gray-900">
                تصدير سجلات الغياب
              </h1>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              العودة للوحة التحكم
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">تصدير تقارير الغياب</h2>
          <p className="text-gray-600">
            قم بتصدير سجلات الغياب إلى ملف PDF منسق
          </p>
          {user.assignedClass && user.role !== 'service_minister' && user.role !== 'admin' && user.role !== 'serviceLeader' && (
            <p className="text-sm text-blue-600 mt-2">
              الفصل: {user.assignedClass.name}
            </p>
          )}
        </div>
        
        {/* عرض المكون المناسب حسب الصلاحية */}
        {user.role === 'service_minister' || user.role === 'admin' || user.role === 'serviceLeader' ? (
          <ExportAttendanceAdmin />
        ) : (
          <ExportAttendanceTeacher />
        )}
      </main>
    </div>
  )
}
