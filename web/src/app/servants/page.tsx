'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { servantsAPI } from '@/services/api'

interface Servant {
  _id: string
  name: string
  phone?: string
  classesAssigned?: string[]
  role?: string
  createdAt: string
}

export default function ServantsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [servants, setServants] = useState<Servant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingServant, setEditingServant] = useState<Servant | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: ''
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    
    // Check if user has permission to access servants page
    if (isAuthenticated && user && user.role !== 'admin' && user.role !== 'serviceLeader') {
      toast.error('ليس لديك صلاحية للوصول لهذه الصفحة')
      router.push('/dashboard')
      return
    }
    
    if (isAuthenticated) {
      fetchServants()
    }
  }, [isAuthenticated, isLoading, router, user])

  const fetchServants = async () => {
    try {
      setLoading(true)
      const response = await servantsAPI.getAll()
      if (response.success && response.data) {
        setServants(response.data)
      } else {
        toast.error('فشل في تحميل بيانات الخدام')
        setServants([])
      }
    } catch (error: any) {
      console.error('Error fetching servants:', error)
      toast.error('حدث خطأ في تحميل بيانات الخدام')
      setServants([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddServant = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // التحقق من البيانات المطلوبة
    if (!formData.name.trim()) {
      toast.error('الاسم مطلوب')
      return
    }

    try {
      const response = await servantsAPI.create(formData)
      if (response.success) {
        toast.success('تم إضافة الخادم بنجاح')
        setFormData({
          name: '',
          phone: '',
          role: ''
        })
        setShowAddModal(false)
        fetchServants()
      } else {
        toast.error(response.error || 'حدث خطأ في إضافة الخادم')
      }
    } catch (error: any) {
      console.error('Error adding servant:', error)
      const errorMessage = error.response?.data?.error || 'حدث خطأ في إضافة الخادم'
      toast.error(errorMessage)
    }
  }

  const handleEditServant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingServant) return

    // التحقق من البيانات المطلوبة
    if (!formData.name.trim()) {
      toast.error('الاسم مطلوب')
      return
    }

    try {
      const response = await servantsAPI.update(editingServant._id, formData)
      if (response.success) {
        toast.success('تم تحديث بيانات الخادم بنجاح')
        setEditingServant(null)
        setFormData({
          name: '',
          phone: '',
          role: ''
        })
        fetchServants()
      } else {
        toast.error(response.error || 'حدث خطأ في تحديث بيانات الخادم')
      }
    } catch (error: any) {
      console.error('Error updating servant:', error)
      const errorMessage = error.response?.data?.error || 'حدث خطأ في تحديث بيانات الخادم'
      toast.error(errorMessage)
    }
  }

  const handleDeleteServant = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخادم؟')) return

    try {
      const response = await servantsAPI.delete(id)
      if (response.success) {
        toast.success('تم حذف الخادم بنجاح')
        fetchServants()
      } else {
        toast.error(response.error || 'حدث خطأ في حذف الخادم')
      }
    } catch (error: any) {
      console.error('Error deleting servant:', error)
      const errorMessage = error.response?.data?.error || 'حدث خطأ في حذف الخادم'
      toast.error(errorMessage)
    }
  }

  const openEditModal = (servant: Servant) => {
    setEditingServant(servant)
    setFormData({
      name: servant.name,
      phone: servant.phone || '',
      role: servant.role || ''
    })
  }

  const filteredServants = servants.filter(servant =>
    servant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (servant.phone && servant.phone.includes(searchTerm)) ||
    (servant.role && servant.role.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <h1 className="text-3xl font-bold text-gray-900 text-right">إدارة الخدام</h1>
        <p className="text-gray-600 text-right mt-2">إدارة بيانات الخدام وأدوارهم</p>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="البحث عن خادم..."
            className="w-full p-3 border border-gray-300 rounded-lg text-right"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          إضافة خادم جديد
        </button>
      </div>

      {/* Servants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الاسم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الهاتف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الدور
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServants.map((servant) => (
                <tr key={servant._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {servant.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {servant.phone || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {servant.role || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => openEditModal(servant)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteServant(servant._id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredServants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد خدام مطابقة للبحث</p>
          </div>
        )}
      </div>

      {/* Add Servant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إضافة خادم جديد</h3>
              <form onSubmit={handleAddServant} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="اسم الخادم"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="رقم الهاتف"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="الدور/المنصب"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  />
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

      {/* Edit Servant Modal */}
      {editingServant && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">تعديل بيانات الخادم</h3>
              <form onSubmit={handleEditServant} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="اسم الخادم"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="رقم الهاتف"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="الدور/المنصب"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  />
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
                    onClick={() => setEditingServant(null)}
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
