'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  UserGroupIcon,
  FunnelIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { childrenAPI, classesAPI } from '@/services/api'

interface Child {
  _id: string
  name: string
  classId?: string
  className?: string
  phone?: string
  notes?: string
  class?: {
    _id: string
    name: string
    description?: string
    stage?: string
    grade?: string
  }
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
  const [classFilter, setClassFilter] = useState('all') // فلتر الفصول الجديد
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped') // نوع العرض
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
      // تعيين نوع العرض حسب دور المستخدم
      if (user.role === 'admin' || user.role === 'serviceLeader') {
        setViewMode('grouped') // العرض المجمع كافتراضي لأمين الخدمة
      }
      
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
      // أولاً: تحميل الأطفال بناءً على دور المستخدم
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

      let loadedChildren: Child[] = []
      if (childrenResponse.success) {
        loadedChildren = childrenResponse.data || []
        setChildren(loadedChildren)
      } else {
        toast.error('فشل في تحميل بيانات الأطفال')
        setChildren([])
      }

      // ثانياً: استخراج الفصول من الأطفال الموجودين فعلاً
      let availableClasses: Class[] = []
      if (user?.role === 'admin' || user?.role === 'serviceLeader') {
        // للإداري وأمين الخدمة: جلب جميع الفصول أولاً
        const allClassesResponse = await classesAPI.getAllClasses()
        if (allClassesResponse.success && allClassesResponse.data) {
          const allClasses = allClassesResponse.data.filter((cls: any) => {
            const name = cls.name.toLowerCase()
            return !name.includes('تجريبي') && 
                   !name.includes('اختبار') && 
                   !name.includes('test') && 
                   !name.includes('experimental')
          })
          
          // استخراج IDs الفصول من الأطفال الموجودين
          const classIdsWithChildren = Array.from(new Set(
            loadedChildren
              .filter(child => {
                const childClassId = child.classId || child.class?._id
                return childClassId && childClassId !== 'undefined'
              })
              .map(child => child.classId || child.class?._id)
          ))
          
          // فلترة الفصول لتعرض فقط التي تحتوي على أطفال
          availableClasses = allClasses.filter((cls: any) => 
            classIdsWithChildren.includes(cls._id)
          )
        }
      } else if ((user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass) {
        // مدرس الفصل والخادم يرون فصلهم فقط إذا كان به أطفال
        const hasChildren = loadedChildren.some(child => {
          const childClassId = child.classId || child.class?._id
          return childClassId === user.assignedClass!._id
        })
        availableClasses = hasChildren ? [user.assignedClass] : []
      }

      setClasses(availableClasses)
      
      // إعادة تعيين فلتر الفصل إذا لم يعد موجوداً في القائمة الجديدة
      if (classFilter !== 'all' && !availableClasses.some(cls => cls._id === classFilter)) {
        setClassFilter('all')
        console.log('Reset class filter because selected class no longer available')
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
    
    // التحقق من الاسم فقط (مطلوب لجميع المستخدمين)
    if (!formData.name || formData.name.trim() === '') {
      toast.error('يرجى إدخال اسم الطفل')
      return
    }

    // للإداري وأمين الخدمة: التحقق من وجود الفصل
    if ((user?.role === 'admin' || user?.role === 'serviceLeader') && !formData.classId) {
      toast.error('يرجى اختيار الفصل')
      return
    }

    // لمدرس الفصل: تعيين الفصل تلقائياً
    let finalClassId = formData.classId;
    if ((user?.role === 'classTeacher' || user?.role === 'servant') && user?.assignedClass) {
      finalClassId = user.assignedClass._id;
    }

    // التحقق من أن هناك فصل محدد في النهاية
    if (!finalClassId) {
      toast.error('لا يمكن تحديد الفصل المناسب')
      return
    }

    try {
      const childData = {
        name: formData.name.trim(),
        classId: finalClassId,
        phone: formData.phone || '',
        notes: formData.notes || ''
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
        // عرض رسالة خطأ مفصلة إذا كانت متوفرة
        const errorMessage = (response as any).details 
          ? `${response.error}: ${(response as any).details}`
          : response.error || 'فشل في حفظ بيانات الطفل';
        toast.error(errorMessage)
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

  // تعيين الفصل تلقائياً للمدرس والخادم عند فتح نموذج الإضافة
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

  // Filter children based on search and class filter
  const filteredChildren = children.filter(child => {
    const matchesSearch = child.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Handle both classId (string) and class (object) formats
    const childClassId = child.classId || child.class?._id
    const matchesClass = classFilter === 'all' || childClassId === classFilter
    
    return matchesSearch && matchesClass
  })

  // Add class names to children
  const enrichedChildren = filteredChildren.map(child => {
    // Handle both formats: classId (string) or class (object)
    const childClassId = child.classId || child.class?._id
    const childClass = classes.find(cls => cls._id === childClassId)
    
    return {
      ...child,
      className: child.class?.name || child.className || childClass?.name || 'غير محدد'
    }
  })

  // Group children by class for grouped view
  const groupedChildren = classes.map(classItem => {
    const classChildren = enrichedChildren.filter(child => {
      const childClassId = child.classId || child.class?._id
      return childClassId === classItem._id
    })
    return {
      class: classItem,
      children: classChildren,
      count: classChildren.length
    }
  }).filter(group => group.count > 0) // Only show classes that have children

  // Children without class
  const childrenWithoutClass = enrichedChildren.filter(child => {
    const childClassId = child.classId || child.class?._id
    return !childClassId || childClassId === 'undefined'
  })
  if (childrenWithoutClass.length > 0) {
    groupedChildren.push({
      class: { _id: 'no-class', name: 'بدون فصل', description: 'أطفال غير مخصصين لفصل' },
      children: childrenWithoutClass,
      count: childrenWithoutClass.length
    })
  }

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
              
              {(user?.role === 'admin' || user?.role === 'serviceLeader' || user?.role === 'classTeacher' || user?.role === 'servant') && (
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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

            {/* فلتر الفصول - فقط للإداري وأمين الخدمة */}
            {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  فلتر حسب الفصل
                </label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="فلتر حسب الفصل"
                >
                  <option value="all">جميع الفصول</option>
                  {classes.map(classItem => (
                    <option key={classItem._id} value={classItem._id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* نوع العرض - فقط للإداري وأمين الخدمة */}
            {(user?.role === 'admin' || user?.role === 'serviceLeader') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نوع العرض
                </label>
                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === 'grouped'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="عرض حسب الفصول"
                  >
                    <Squares2X2Icon className="w-4 h-4 inline ml-1" />
                    مجموعات
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="عرض قائمة"
                  >
                    <ListBulletIcon className="w-4 h-4 inline ml-1" />
                    قائمة
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center text-sm text-gray-600">
              <UserGroupIcon className="w-5 h-5 ml-2" />
              إجمالي الأطفال: {enrichedChildren.length}
              {classFilter !== 'all' && (
                <span className="mr-2 text-blue-600">
                  (مفلتر: {filteredChildren.length})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Children Display */}
        {(user?.role === 'admin' || user?.role === 'serviceLeader') ? (
          // عرض للإداري وأمين الخدمة مع إمكانية التبديل بين الأنماط
          viewMode === 'grouped' ? (
            // العرض المجمع حسب الفصول
            <div className="space-y-6">
              {groupedChildren.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">لا توجد أطفال مسجلين</p>
                  <p className="text-gray-400 text-sm mt-2">ابدأ بإضافة أطفال جدد للنظام</p>
                </div>
              ) : (
                groupedChildren.map((group) => (
                  <div key={group.class._id} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Class Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <UserGroupIcon className="w-6 h-6 ml-3" />
                          <div>
                            <h3 className="text-lg font-semibold">{group.class.name}</h3>
                            {group.class.description && (
                              <p className="text-blue-100 text-sm">{group.class.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-left">
                          <span className="bg-blue-500 bg-opacity-50 px-3 py-1 rounded-full text-sm font-medium">
                            {group.count} طفل
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Children Grid */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.children.map((child) => (
                          <div key={child._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-1">{child.name}</h4>
                                {child.phone && (
                                  <p className="text-sm text-gray-600 mb-1">📞 {child.phone}</p>
                                )}
                                {child.notes && (
                                  <p className="text-sm text-gray-500 truncate" title={child.notes}>
                                    📝 {child.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 space-x-reverse pt-3 border-t border-gray-100">
                              <button
                                onClick={() => openEditModal(child)}
                                className="flex-1 inline-flex items-center justify-center px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                                title="تعديل بيانات الطفل"
                              >
                                <PencilIcon className="w-4 h-4 ml-1" />
                                تعديل
                              </button>
                              
                              <button
                                onClick={() => handleDelete(child._id)}
                                className="flex-1 inline-flex items-center justify-center px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                                title="حذف الطفل نهائياً"
                              >
                                <TrashIcon className="w-4 h-4 ml-1" />
                                حذف
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // العرض كقائمة
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الاسم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفصل</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الهاتف</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الملاحظات</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {enrichedChildren.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 whitespace-nowrap text-center text-gray-500">
                          <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="font-medium">لا توجد أطفال مسجلين</p>
                          <p className="text-sm mt-1">ابدأ بإضافة أطفال جدد للنظام</p>
                        </td>
                      </tr>
                    ) : (
                      enrichedChildren.map((child) => (
                        <tr key={child._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{child.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              child.className === 'غير محدد' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {child.className}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{child.phone || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={child.notes || ''}>{child.notes || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <button
                                onClick={() => openEditModal(child)}
                                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                title="تعديل بيانات الطفل"
                              >
                                <PencilIcon className="w-4 h-4 ml-1" />
                                تعديل
                              </button>
                              
                              <button
                                onClick={() => handleDelete(child._id)}
                                className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                title="حذف الطفل نهائياً"
                              >
                                <TrashIcon className="w-4 h-4 ml-1" />
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          // العرض المبسط لمدرس الفصل والخدام (فقط قائمة بدون فلتر)
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
                      <td colSpan={4} className="px-6 py-8 whitespace-nowrap text-center text-gray-500">
                        <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="font-medium">لا توجد أطفال مسجلين</p>
                        <p className="text-sm mt-1">ابدأ بإضافة أطفال جدد لفصلك</p>
                      </td>
                    </tr>
                  ) : (
                    enrichedChildren.map((child) => (
                      <tr key={child._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{child.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{child.phone || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={child.notes || ''}>{child.notes || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-3 space-x-reverse">
                            {(user?.role === 'classTeacher' || user?.role === 'servant') && (
                              <>
                                <button
                                  onClick={() => openEditModal(child)}
                                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                  title="تعديل بيانات الطفل"
                                >
                                  <PencilIcon className="w-4 h-4 ml-1" />
                                  تعديل
                                </button>
                                
                                {user?.role === 'classTeacher' && (
                                  <button
                                    onClick={() => handleDelete(child._id)}
                                    className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                    title="حذف الطفل نهائياً"
                                  >
                                    <TrashIcon className="w-4 h-4 ml-1" />
                                    حذف
                                  </button>
                                )}
                              </>
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
        )}
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
                      onChange={(e) => {
                        // تنظيف رقم الهاتف - إزالة كل شيء عدا الأرقام والعلامات المعتادة
                        const cleanedPhone = e.target.value.replace(/[^\d\+\-\(\)\s]/g, '');
                        // تحديد الحد الأقصى للطول
                        if (cleanedPhone.length <= 20) {
                          setFormData({ ...formData, phone: cleanedPhone });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="رقم الهاتف (مثال: 01234567890)"
                      maxLength={20}
                    />
                    {formData.phone && formData.phone.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        الطول: {formData.phone.length} أحرف
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* لمدرس الفصل والخدام: نموذج مبسط بدون حقل الفصل */}
              {(user?.role === 'classTeacher' || user?.role === 'servant') && (
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
                      onChange={(e) => {
                        // تنظيف رقم الهاتف - إزالة كل شيء عدا الأرقام والعلامات المعتادة
                        const cleanedPhone = e.target.value.replace(/[^\d\+\-\(\)\s]/g, '');
                        // تحديد الحد الأقصى للطول
                        if (cleanedPhone.length <= 20) {
                          setFormData({ ...formData, phone: cleanedPhone });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="رقم الهاتف (مثال: 01234567890)"
                      maxLength={20}
                    />
                    {formData.phone && formData.phone.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        الطول: {formData.phone.length} أحرف
                      </div>
                    )}
                  </div>

                  {/* عرض الفصل المخصص كنص فقط */}
                  {user?.assignedClass && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الفصل المخصص
                      </label>
                      <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                        {user.assignedClass.name}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => {
                    // تحديد الحد الأقصى للطول
                    if (e.target.value.length <= 500) {
                      setFormData({ ...formData, notes: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                  maxLength={500}
                />
                {formData.notes && formData.notes.length > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    الطول: {formData.notes.length}/500 أحرف
                  </div>
                )}
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
