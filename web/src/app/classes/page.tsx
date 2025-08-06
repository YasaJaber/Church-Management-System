'use client'

export const dynamic = 'force-dynamic'




import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContextSimple'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { classesAPI, childrenAPI } from '@/services/api'

interface Class {
  _id: string
  name: string
  grade: string
  servant?: string
  active: boolean
  createdAt: string
}

interface Child {
  _id: string
  name: string
  class: string
}

export default function ClassesPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [classes, setClasses] = useState<Class[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    servant: '',
    active: true
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    // Check if user has permission to access classes page
    if (isAuthenticated && user && user.role !== 'admin' && user.role !== 'serviceLeader') {
      toast.error('ليس لديك صلاحية للوصول لهذه الصفحة')
      router.push('/dashboard')
      return
    }
    
    if (isAuthenticated) {
      fetchClasses()
    }
  }, [isAuthenticated, isLoading, router, user])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const response = await classesAPI.getAll()
      if (response.success && response.data) {
        // Filter out experimental/test classes
        const filteredClasses = response.data.filter((cls: Class) => {
          const name = cls.name.toLowerCase()
          return !name.includes('تجريبي') && 
                 !name.includes('اختبار') && 
                 !name.includes('test') && 
                 !name.includes('experimental')
        })
        setClasses(filteredClasses)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClassChildren = async (classId: string) => {
    try {
      const response = await childrenAPI.getByClass(classId)
      if (response.success && response.data) {
        setChildren(response.data)
      }
    } catch (error) {
      console.error('Error fetching class children:', error)
    }
  }

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await classesAPI.create(formData)
      if (response.success) {
        setFormData({
          name: '',
          grade: '',
          servant: '',
          active: true
        })
        setShowAddModal(false)
        fetchClasses()
      }
    } catch (error) {
      console.error('Error adding class:', error)
    }
  }

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClass) return

    try {
      const response = await classesAPI.update(editingClass._id, formData)
      if (response.success) {
        setEditingClass(null)
        setFormData({
          name: '',
          grade: '',
          servant: '',
          active: true
        })
        fetchClasses()
      }
    } catch (error) {
      console.error('Error updating class:', error)
    }
  }

  const handleDeleteClass = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفصل؟ سيتم إلغاء تعيين جميع الأطفال المسجلين فيه.')) return

    try {
      const response = await classesAPI.delete(id)
      if (response.success) {
        fetchClasses()
        if (selectedClass && selectedClass._id === id) {
          setSelectedClass(null)
          setChildren([])
        }
      }
    } catch (error) {
      console.error('Error deleting class:', error)
    }
  }

  const openEditModal = (classItem: Class) => {
    setEditingClass(classItem)
    setFormData({
      name: classItem.name,
      grade: classItem.grade,
      servant: classItem.servant || '',
      active: classItem.active
    })
  }

  const viewClassDetails = (classItem: Class) => {
    setSelectedClass(classItem)
    fetchClassChildren(classItem._id)
  }

  const filteredClasses = classes.filter(classItem =>
    classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (classItem.servant && classItem.servant.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 text-right">إدارة الفصول</h1>
        <p className="text-gray-600 text-right mt-2">تنظيم الفصول وإدارة توزيع الأطفال</p>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="البحث عن فصل..."
            className="w-full p-3 border border-gray-300 rounded-lg text-right"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          إضافة فصل جديد
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classes List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold text-gray-900">قائمة الفصول</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    اسم الفصل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المرحلة
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
                {filteredClasses.map((classItem) => (
                  <tr key={classItem._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {classItem.name}
                      </div>
                      {classItem.servant && (
                        <div className="text-sm text-gray-500">
                          خادم: {classItem.servant}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {classItem.grade}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        classItem.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {classItem.active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewClassDetails(classItem)}
                        className="text-blue-600 hover:text-blue-900 ml-4"
                      >
                        عرض
                      </button>
                      <button
                        onClick={() => openEditModal(classItem)}
                        className="text-indigo-600 hover:text-indigo-900 ml-4"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteClass(classItem._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClasses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">لا توجد فصول مطابقة للبحث</p>
            </div>
          )}
        </div>

        {/* Class Details */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedClass ? `تفاصيل فصل: ${selectedClass.name}` : 'اختر فصلاً لعرض التفاصيل'}
            </h2>
          </div>
          
          {selectedClass ? (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-md font-medium text-gray-900 mb-2">معلومات الفصل</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>اسم الفصل:</strong> {selectedClass.name}</p>
                  <p><strong>المرحلة:</strong> {selectedClass.grade}</p>
                  {selectedClass.servant && <p><strong>الخادم:</strong> {selectedClass.servant}</p>}
                  <p><strong>الحالة:</strong> {selectedClass.active ? 'نشط' : 'غير نشط'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-md font-medium text-gray-900 mb-2">
                  الأطفال المسجلين ({children.length})
                </h3>
                <div className="max-h-64 overflow-y-auto">
                  {children.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {children.map((child) => (
                        <li key={child._id} className="py-2">
                          <div className="text-sm text-gray-900">{child.name}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-center py-4">لا توجد أطفال مسجلين في هذا الفصل</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">اختر فصلاً من القائمة لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إضافة فصل جديد</h3>
              <form onSubmit={handleAddClass} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="اسم الفصل"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    required
                  >
                    <option value="">اختر المرحلة</option>
                    <option value="الحضانة">الحضانة</option>
                    <option value="الأولى الابتدائي">الأولى الابتدائي</option>
                    <option value="الثانية الابتدائي">الثانية الابتدائي</option>
                    <option value="الثالثة الابتدائي">الثالثة الابتدائي</option>
                    <option value="الرابعة الابتدائي">الرابعة الابتدائي</option>
                    <option value="الخامسة الابتدائي">الخامسة الابتدائي</option>
                    <option value="السادسة الابتدائي">السادسة الابتدائي</option>
                    <option value="الإعدادي">الإعدادي</option>
                    <option value="الثانوي">الثانوي</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="اسم الخادم (اختياري)"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.servant}
                    onChange={(e) => setFormData({...formData, servant: e.target.value})}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({...formData, active: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="mr-2 text-sm text-gray-900">فصل نشط</span>
                  </label>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">تعديل بيانات الفصل</h3>
              <form onSubmit={handleEditClass} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="اسم الفصل"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    required
                  >
                    <option value="">اختر المرحلة</option>
                    <option value="الحضانة">الحضانة</option>
                    <option value="الأولى الابتدائي">الأولى الابتدائي</option>
                    <option value="الثانية الابتدائي">الثانية الابتدائي</option>
                    <option value="الثالثة الابتدائي">الثالثة الابتدائي</option>
                    <option value="الرابعة الابتدائي">الرابعة الابتدائي</option>
                    <option value="الخامسة الابتدائي">الخامسة الابتدائي</option>
                    <option value="السادسة الابتدائي">السادسة الابتدائي</option>
                    <option value="الإعدادي">الإعدادي</option>
                    <option value="الثانوي">الثانوي</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="اسم الخادم (اختياري)"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.servant}
                    onChange={(e) => setFormData({...formData, servant: e.target.value})}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({...formData, active: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="mr-2 text-sm text-gray-900">فصل نشط</span>
                  </label>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    حفظ التغييرات
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingClass(null)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    إلغاء
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
