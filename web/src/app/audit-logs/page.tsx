'use client'

import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { api } from '@/services/api'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface LoginDetails {
  deviceType: string
  deviceModel?: string
  browser: string
  os: string
  isMobile: boolean
  screenResolution?: string
  windowSize?: string
  timezone?: string
  language?: string
  connectionType?: string
  batteryLevel?: number | null
  batteryCharging?: boolean | null
  cpuCores?: number | null
  deviceMemory?: number | null
  touchSupport?: boolean
  online?: boolean
  platform?: string
}

interface AuditLog {
  _id: string
  action: 'create' | 'update' | 'delete' | 'login'
  collection: string
  collectionNameAr: string
  documentId: string
  documentName: string
  userId: {
    _id: string
    name: string
    username: string
  }
  userName: string
  userRole: string
  classId?: {
    _id: string
    name: string
  }
  className: string
  changes: {
    before: any
    after: any
  }
  description: string
  createdAt: string
  ipAddress?: string
  userAgent?: string
  loginDetails?: LoginDetails
}

interface Pagination {
  total: number
  page: number
  pages: number
  limit: number
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  login: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

const actionNames: Record<string, string> = {
  create: 'إضافة',
  update: 'تعديل',
  delete: 'حذف',
  login: 'تسجيل دخول',
}

const actionIcons: Record<string, string> = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  login: '🔐',
}

const roleNames: Record<string, string> = {
  admin: 'مدير النظام',
  serviceLeader: 'أمين الخدمة',
  classTeacher: 'مدرس الفصل',
  servant: 'خادم',
}

export default function AuditLogsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, pages: 0, limit: 50 })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  
  // Filters
  const [filterCollection, setFilterCollection] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchLogs()
    }
  }, [isAuthenticated, user, pagination.page, filterCollection, filterAction, filterStartDate, filterEndDate])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      
      // تحديد الـ endpoint حسب دور المستخدم
      const isClassUser = user?.role === 'servant' || user?.role === 'classTeacher'
      const endpoint = isClassUser ? '/audit-logs/my-class' : '/audit-logs'
      
      const params = new URLSearchParams()
      params.append('page', pagination.page.toString())
      params.append('limit', '50')
      if (filterCollection) params.append('collection', filterCollection)
      if (filterAction) params.append('action', filterAction)
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)

      const response = await api.get(`${endpoint}?${params}`)
      
      if (response.data.success) {
        setLogs(response.data.data)
        setPagination(response.data.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching audit logs:', error)
      toast.error('حدث خطأ في جلب السجلات')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy - hh:mm a', { locale: ar })
    } catch {
      return dateString
    }
  }

  const renderChanges = (changes: { before: any; after: any }) => {
    if (!changes) return null
    
    const { before, after } = changes
    if (!before && !after) return null

    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ])

    const fieldNames: Record<string, string> = {
      name: 'الاسم',
      phone: 'الهاتف',
      parentName: 'ولي الأمر',
      notes: 'ملاحظات',
      status: 'الحالة',
      class: 'الفصل',
      stage: 'المرحلة',
      grade: 'الصف',
      isActive: 'نشط',
    }

    return (
      <div className="mt-2 space-y-1 text-sm">
        {Array.from(allKeys).map((key) => {
          if (key.startsWith('_') || key === 'updatedAt' || key === 'createdAt') return null
          
          const beforeVal = before?.[key]
          const afterVal = after?.[key]
          
          if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) return null

          return (
            <div key={key} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="font-medium">{fieldNames[key] || key}:</span>
              {beforeVal !== undefined && (
                <span className="line-through text-red-500">{String(beforeVal)}</span>
              )}
              {afterVal !== undefined && (
                <span className="text-green-600">← {String(afterVal)}</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const isServiceLeaderOrAdmin = user.role === 'admin' || user.role === 'serviceLeader'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white ml-4"
              >
                ← الرجوع
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                📋 سجل العمليات
                {!isServiceLeaderOrAdmin && user.assignedClass && (
                  <span className="text-blue-600 dark:text-blue-400 mr-2">
                    - {user.assignedClass.name}
                  </span>
                )}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">🔍 تصفية السجلات</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                نوع البيانات
              </label>
              <select
                id="filterCollection"
                title="تصفية حسب نوع البيانات"
                value={filterCollection}
                onChange={(e) => setFilterCollection(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">الكل</option>
                <option value="auth">تسجيل الدخول</option>
                <option value="children">الأطفال</option>
                <option value="attendance">الحضور</option>
                <option value="users">المستخدمين</option>
                <option value="classes">الفصول</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                نوع العملية
              </label>
              <select
                id="filterAction"
                title="تصفية حسب نوع العملية"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">الكل</option>
                <option value="login">تسجيل دخول</option>
                <option value="create">إضافة</option>
                <option value="update">تعديل</option>
                <option value="delete">حذف</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                من تاريخ
              </label>
              <input
                type="date"
                id="filterStartDate"
                title="تاريخ البداية"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                إلى تاريخ
              </label>
              <input
                type="date"
                id="filterEndDate"
                title="تاريخ النهاية"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setFilterCollection('')
                setFilterAction('')
                setFilterStartDate('')
                setFilterEndDate('')
              }}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              مسح الفلاتر
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              إجمالي السجلات: <strong className="text-gray-900 dark:text-white">{pagination.total}</strong>
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              الصفحة {pagination.page} من {pagination.pages}
            </span>
          </div>
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">لا توجد سجلات</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log._id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedLog(selectedLog?._id === log._id ? null : log)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{actionIcons[log.action]}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColors[log.action]}`}>
                          {actionNames[log.action]}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {log.documentName || 'سجل'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          في {log.collectionNameAr}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        بواسطة: <span className="font-medium">{log.userName}</span>
                        {log.className && (
                          <span className="mr-2">
                            • الفصل: <span className="font-medium">{log.className}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-left text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(log.createdAt)}
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedLog?._id === log._id && (
                  <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-4">
                    {/* معلومات المستخدم والجهاز */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span>👤</span> معلومات المستخدم والجهاز
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {/* اسم المستخدم والدور */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">المستخدم:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{log.userName}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            log.userRole === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            log.userRole === 'serviceLeader' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {roleNames[log.userRole] || log.userRole}
                          </span>
                        </div>
                        
                        {/* الفصل */}
                        {log.className && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">الفصل:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{log.className}</span>
                          </div>
                        )}
                        
                        {/* IP Address */}
                        {log.ipAddress && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">🌐 عنوان IP:</span>
                            <span className="font-mono text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded text-xs">
                              {log.ipAddress}
                            </span>
                          </div>
                        )}
                        
                        {/* معلومات الجهاز */}
                        {log.loginDetails && (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400">
                                {log.loginDetails.isMobile ? '📱' : '💻'} نوع الجهاز:
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {log.loginDetails.deviceType}
                              </span>
                            </div>

                            {log.loginDetails.deviceModel && log.loginDetails.deviceModel !== 'غير معروف' && (
                              <div className="flex items-center gap-2 col-span-2">
                                <span className="text-gray-500 dark:text-gray-400">📲 موديل الجهاز:</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                  {log.loginDetails.deviceModel}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400">🌍 المتصفح:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {log.loginDetails.browser}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 dark:text-gray-400">⚙️ نظام التشغيل:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {log.loginDetails.os}
                              </span>
                            </div>

                            {log.loginDetails.platform && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">🖥️ المنصة:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.loginDetails.platform}
                                </span>
                              </div>
                            )}

                            {log.loginDetails.screenResolution && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">📐 دقة الشاشة:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.loginDetails.screenResolution}
                                </span>
                              </div>
                            )}

                            {log.loginDetails.windowSize && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">🪟 حجم النافذة:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.loginDetails.windowSize}
                                </span>
                              </div>
                            )}

                            {log.loginDetails.timezone && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">🕐 المنطقة الزمنية:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.loginDetails.timezone}
                                </span>
                              </div>
                            )}

                            {log.loginDetails.language && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">🔤 اللغة:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.loginDetails.language}
                                </span>
                              </div>
                            )}

                            {log.loginDetails.connectionType && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">📶 نوع الاتصال:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.loginDetails.connectionType}
                                </span>
                              </div>
                            )}

                            {log.loginDetails.cpuCores && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">🔢 أنوية المعالج:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.loginDetails.cpuCores}
                                </span>
                              </div>
                            )}

                            {log.loginDetails.deviceMemory && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">💾 ذاكرة الجهاز:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.loginDetails.deviceMemory} GB
                                </span>
                              </div>
                            )}

                            {log.loginDetails.batteryLevel !== null && log.loginDetails.batteryLevel !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">🔋 البطارية:</span>
                                <span className={`font-medium ${
                                  log.loginDetails.batteryLevel > 50 ? 'text-green-600 dark:text-green-400' :
                                  log.loginDetails.batteryLevel > 20 ? 'text-yellow-600 dark:text-yellow-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>
                                  {log.loginDetails.batteryLevel}%
                                  {log.loginDetails.batteryCharging && ' ⚡ (شحن)'}
                                </span>
                              </div>
                            )}

                            {log.loginDetails.touchSupport !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400">👆 دعم اللمس:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.loginDetails.touchSupport ? 'نعم ✓' : 'لا ✗'}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* التغييرات (لو موجودة) */}
                    {log.action !== 'login' && (log.changes?.before || log.changes?.after) && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">📝 التغييرات:</h4>
                        {renderChanges(log.changes)}
                      </div>
                    )}
                    
                    {/* رسالة لو مفيش تفاصيل */}
                    {log.action !== 'login' && !log.changes?.before && !log.changes?.after && !log.ipAddress && !log.loginDetails && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد تفاصيل إضافية</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              السابق
            </button>
            <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              التالي
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
