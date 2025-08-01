'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  UserGroupIcon 
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { childrenAPI, classesAPI } from '@/services/api'

interface Child {
  _id: string
  name: string
  classId: string
  className?: string
  phone?: string
  notes?: string
}

interface Class {
  _id: string
  name: string
  description?: string
}

export default function ChildrenPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [children, setChildren] = useState<Child[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)

  // Form state - مبسط حسب المطلوب
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    phone: '',
    notes: ''
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    // التحقق من الصلاحيات
    if (isAuthenticated && user) {
      // الإداري وأمين الخدمة يمكنهم رؤية جميع الأطفال
      // مدرس الفصل يمكنه رؤية أطفال فصله فقط
      // الخادم يمكنه رؤية أطفال فصله فقط
      if (user.role === 'admin' || user.role === 'serviceLeader' || 
          user.role === 'classTeacher' || user.role === 'servant') {
        loadData()
      } else {
        toast.error('ليس لديك صلاحية للوصول لهذه الصفحة')
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  const loadData = async () => {
    setLoading(true)
    try {
      // تحديد الفصول بناءً على دور المستخدم
      let classesResponse
      if (user?.role === 'admin' || user?.role === 'serviceLeader') {
        // الإداري وأمين الخدمة يرون جميع الفصول
        classesResponse = await classesAPI.getAllClasses()
      } else if ((user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass) {
        // مدرس الفصل والخادم يرون فصلهم فقط
        classesResponse = {
          success: true,
          data: [user.assignedClass]
        }
      } else {
        // إذا لم يكن له فصل مخصص
        classesResponse = { success: true, data: [] }
      }

      // تحديد الأطفال بناءً على دور المستخدم
      let childrenResponse
      if (user?.role === 'admin' || user?.role === 'serviceLeader') {
        // الإداري وأمين الخدمة يرون جميع الأطفال
        childrenResponse = await childrenAPI.getAllChildren()
      } else if ((user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass) {
        // مدرس الفصل والخادم يرون أطفال فصلهم فقط
        childrenResponse = await childrenAPI.getByClass(user.assignedClass._id)
      } else {
        childrenResponse = { success: true, data: [] }
      }

      if (childrenResponse.success) {
        setChildren(childrenResponse.data || [])
      } else {
        toast.error('فشل في تحميل بيانات الأطفال')
      }

      if (classesResponse.success) {
        setClasses(classesResponse.data || [])
      } else {
        toast.error('فشل في تحميل بيانات الفصول')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.classId) {
      toast.error('يرجى ملء الحقول المطلوبة (الاسم والفصل)')
      return
    }

    // التحقق من أذونات الإضافة فقط - التعديل مسموح للجميع
    if (!selectedChild && (user?.role === 'classTeacher' || user?.role === 'servant')) {
      // المدرس يمكنه إضافة أطفال لفصله فقط
      if (formData.classId !== user?.assignedClass?._id) {
        toast.error('يمكنك إضافة أطفال لفصلك فقط')
        return
      }
    }

    try {
      const childData = {
        ...formData
      }

      let response
      if (selectedChild) {
        // Update existing child
        response = await childrenAPI.updateChild(selectedChild._id, childData)
      } else {
        // Create new child
        response = await childrenAPI.createChild(childData)
      }

      if (response.success) {
        toast.success(selectedChild ? 'تم تحديث بيانات الطفل بنجاح' : 'تم إضافة الطفل بنجاح')
        resetForm()
        loadData()
      } else {
        toast.error(response.error || 'فشل في حفظ بيانات الطفل')
      }
    } catch (error) {
      console.error('Error saving child:', error)
      toast.error('حدث خطأ في حفظ البيانات')
    }
  }

  const handleDelete = async (childId: string) => {
    // العثور على بيانات الطفل للتأكيد
    const childToDelete = children.find(c => c._id === childId)
    if (!childToDelete) {
      toast.error('لم يتم العثور على الطفل')
      return
    }

    // رسالة تأكيد واضحة
    const confirmMessage = `هل أنت متأكد من حذف الطفل "${childToDelete.name}" نهائياً؟\n\nتحذير: هذا الإجراء لا يمكن التراجع عنه!`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await childrenAPI.deleteChild(childId)
      
      if (response.success) {
        toast.success(`تم حذف الطفل "${childToDelete.name}" بنجاح`)
        loadData()
      } else {
        toast.error(response.error || 'فشل في حذف الطفل')
      }
    } catch (error) {
      console.error('Error deleting child:', error)
      toast.error('حدث خطأ في حذف الطفل')
    }
  }

  const fixChildrenWithoutClass = async () => {
    const childrenWithoutClass = children.filter(child => !child.classId || child.classId === 'undefined')
    
    if (childrenWithoutClass.length === 0) {
      toast.success('جميع الأطفال لديهم فصول مُعينة')
      return
    }

    if (!confirm(`تم العثور على ${childrenWithoutClass.length} طفل بدون فصل.\nهل تريد تعيين فصل افتراضي لهم؟`)) {
      return
    }

    if (classes.length === 0) {
      toast.error('لا توجد فصول متاحة')
      return
    }

    // استخدم أول فصل كفصل افتراضي
    const defaultClassId = classes[0]._id

    try {
      let successCount = 0;
      for (const child of childrenWithoutClass) {
        const payload = {
          name: child.name,
          classId: String(defaultClassId),
          phone: child.phone || '',
          notes: child.notes || ''
        };
        const response = await childrenAPI.updateChild(child._id, payload);
        if (response.success) {
          successCount++;
        }
      }
      toast.success(`تم تعيين فصل لـ ${successCount} طفل بنجاح`);
      loadData();
    } catch (error) {
      console.error('Error fixing children classes:', error);
      toast.error('حدث خطأ في إصلاح الفصول');
    }
  }

  // تعيين الفصل تلقائياً للمدرس عند فتح نموذج الإضافة
  useEffect(() => {
    if (showAddModal && !selectedChild && user && (user.role === 'classTeacher' || user.role === 'servant') && user.assignedClass) {
      setFormData(prev => ({
        ...prev,
        classId: user.assignedClass!._id
      }))
    }
  }, [showAddModal, selectedChild, user])

  const resetForm = () => {
    setFormData({
      name: '',
      classId: '',
      phone: '',
      notes: ''
    })
    setSelectedChild(null)
    setShowAddModal(false)
    setShowEditModal(false)
  }

  const openEditModal = (child: Child) => {
    setSelectedChild(child)
    setFormData({
      name: child.name,
      classId: child.classId && child.classId !== 'undefined' ? child.classId : '',
      phone: child.phone || '',
      notes: child.notes || ''
    })
    setShowEditModal(true)
  }

  // Filter children based on search only
  const filteredChildren = children.filter(child => {
    const matchesSearch = child.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Add class names to children (simplified since we don't show class column)
  const enrichedChildren = filteredChildren

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">جاري تحميل بيانات الأطفال...</p>
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
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 ml-4"
              >
                ← العودة
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                إدارة الأطفال
              </h1>
            </div>
            {/* إضافة طفل مسموحة للجميع إلا الخادم العادي */}
            <div className="flex items-center space-x-3 space-x-reverse">
              {/* زر إصلاح الأطفال بدون فصول - للإداري وأمين الخدمة فقط */}
              {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
                <button
                  onClick={fixChildrenWithoutClass}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-md text-sm transition-colors"
                  title="تعيين فصل للأطفال الذين بدون فصل"
                >
                  🔧 إصلاح الفصول
                </button>
              )}
              
              {(user?.role === 'admin' || user?.role === 'serviceLeader' || user?.role === 'classTeacher') && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors"
                >
                  <PlusIcon className="w-5 h-5 ml-2" />
                  إضافة طفل جديد
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="البحث بالاسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <UserGroupIcon className="w-5 h-5 ml-2" />
              إجمالي الأطفال: {enrichedChildren.length}
            </div>
          </div>
        </div>

        {/* Children Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الهاتف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الملاحظات</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enrichedChildren.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                      لا توجد أطفال مسجلين
                    </td>
                  </tr>
                ) : (
                  enrichedChildren.map((child) => (
                    <tr key={child._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{child.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{child.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{child.notes || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          {/* التعديل مسموح للإداري، أمين الخدمة، ومدرس الفصل فقط */}
                          {(user?.role === 'admin' || user?.role === 'serviceLeader' || user?.role === 'classTeacher') && (
                            <button
                              onClick={() => openEditModal(child)}
                              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                              title="تعديل بيانات الطفل"
                            >
                              <PencilIcon className="w-4 h-4 ml-1" />
                              تعديل
                            </button>
                          )}
                          
                          {/* الحذف متاح للإداري وأمين الخدمة ومدرس الفصل */}
                          {(user?.role === 'admin' || user?.role === 'serviceLeader' || user?.role === 'classTeacher') && (
                            <button
                              onClick={() => handleDelete(child._id)}
                              className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                              title="حذف الطفل نهائياً"
                            >
                              <TrashIcon className="w-4 h-4 ml-1" />
                              حذف
                            </button>
                          )}
                          
                          {/* عرض فقط للخادم العادي */}
                          {user?.role === 'servant' && (
                            <button
                              className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-md cursor-default"
                              title="عرض فقط - لا يمكن التعديل"
                            >
                              <EyeIcon className="w-4 h-4 ml-1" />
                              عرض
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedChild ? 'تعديل بيانات الطفل' : 'إضافة طفل جديد'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* للإداري وأمين الخدمة: نموذج بحقل الفصل */}
              {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم الطفل *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="أدخل اسم الطفل"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الفصل *
                    </label>
                    <select
                      required
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="اختر الفصل"
                    >
                      <option value="">اختر الفصل</option>
                      {classes.map(classItem => (
                        <option key={classItem._id} value={classItem._id}>
                          {classItem.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="رقم الهاتف"
                    />
                  </div>
                </div>
              )}

              {/* لمدرس الفصل: نموذج مبسط بدون حقل الفصل */}
              {user?.role === 'classTeacher' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم الطفل *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="أدخل اسم الطفل"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="رقم الهاتف"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {selectedChild ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
