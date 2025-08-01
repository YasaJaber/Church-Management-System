'use client'

import { useState, useEffect } from 'react'
import { pastoralCareAPI, childrenAPI } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

interface PastoralCare {
  _id: string
  child: {
    _id: string
    name: string
  }
  type: string
  description: string
  date: string
  status: string
  followUpDate?: string
  notes?: string
  createdAt: string
}

interface Child {
  _id: string
  name: string
  class: string
}

export default function PastoralCarePage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [pastoralCares, setPastoralCares] = useState<PastoralCare[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCare, setEditingCare] = useState<PastoralCare | null>(null)
  const [formData, setFormData] = useState({
    child: '',
    type: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    followUpDate: '',
    notes: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')

  // إعادة توجيه إذا لم يكن المستخدم مؤهلاً
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }
    
    // فقط أمين الخدمة والإداري يمكنهم الوصول للرعاية الرعوية
    if (user.role !== 'admin' && user.role !== 'serviceLeader') {
      router.push('/dashboard')
      return
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'serviceLeader')) {
      fetchPastoralCares()
      fetchChildren()
    }
  }, [isAuthenticated, user])

  const fetchPastoralCares = async () => {
    try {
      setLoading(true)
      const response = await pastoralCareAPI.getAll()
      if (response.success && response.data) {
        setPastoralCares(response.data)
      }
    } catch (error) {
      console.error('Error fetching pastoral care records:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchChildren = async () => {
    try {
      const response = await childrenAPI.getAll()
      if (response.success && response.data) {
        setChildren(response.data)
      }
    } catch (error) {
      console.error('Error fetching children:', error)
    }
  }

  const handleAddPastoralCare = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await pastoralCareAPI.create(formData)
      if (response.success) {
        setFormData({
          child: '',
          type: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          followUpDate: '',
          notes: ''
        })
        setShowAddModal(false)
        fetchPastoralCares()
      }
    } catch (error) {
      console.error('Error adding pastoral care record:', error)
    }
  }

  const handleEditPastoralCare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCare) return

    try {
      const response = await pastoralCareAPI.update(editingCare._id, formData)
      if (response.success) {
        setEditingCare(null)
        setFormData({
          child: '',
          type: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          followUpDate: '',
          notes: ''
        })
        fetchPastoralCares()
      }
    } catch (error) {
      console.error('Error updating pastoral care record:', error)
    }
  }

  const handleDeletePastoralCare = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return

    try {
      const response = await pastoralCareAPI.delete(id)
      if (response.success) {
        fetchPastoralCares()
      }
    } catch (error) {
      console.error('Error deleting pastoral care record:', error)
    }
  }

  const openEditModal = (care: PastoralCare) => {
    setEditingCare(care)
    setFormData({
      child: care.child._id,
      type: care.type,
      description: care.description,
      date: care.date.split('T')[0],
      status: care.status,
      followUpDate: care.followUpDate ? care.followUpDate.split('T')[0] : '',
      notes: care.notes || ''
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'follow-up': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار'
      case 'in-progress': return 'قيد المتابعة'
      case 'resolved': return 'تم الحل'
      case 'follow-up': return 'متابعة مطلوبة'
      default: return status
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'spiritual': return 'bg-purple-100 text-purple-800'
      case 'behavioral': return 'bg-orange-100 text-orange-800'
      case 'family': return 'bg-blue-100 text-blue-800'
      case 'academic': return 'bg-green-100 text-green-800'
      case 'health': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'spiritual': return 'روحية'
      case 'behavioral': return 'سلوكية'
      case 'family': return 'أسرية'
      case 'academic': return 'دراسية'
      case 'health': return 'صحية'
      default: return type
    }
  }

  const filteredPastoralCares = pastoralCares.filter(care => {
    const matchesSearch = care.child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         care.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (care.notes && care.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = filterStatus === 'all' || care.status === filterStatus
    const matchesType = filterType === 'all' || care.type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

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
        <h1 className="text-3xl font-bold text-gray-900 text-right">الرعاية الرعوية</h1>
        <p className="text-gray-600 text-right mt-2">متابعة الحالات الخاصة ورعاية الأطفال</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="البحث في السجلات..."
              title="البحث في السجلات"
              className="w-full p-3 border border-gray-300 rounded-lg text-right"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              title="تصفية حسب الحالة"
              className="w-full p-3 border border-gray-300 rounded-lg text-right"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">في الانتظار</option>
              <option value="in-progress">قيد المتابعة</option>
              <option value="resolved">تم الحل</option>
              <option value="follow-up">متابعة مطلوبة</option>
            </select>
          </div>
          <div>
            <select
              title="تصفية حسب النوع"
              className="w-full p-3 border border-gray-300 rounded-lg text-right"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">جميع الأنواع</option>
              <option value="spiritual">روحية</option>
              <option value="behavioral">سلوكية</option>
              <option value="family">أسرية</option>
              <option value="academic">دراسية</option>
              <option value="health">صحية</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              إضافة سجل جديد
            </button>
          </div>
        </div>
      </div>

      {/* Pastoral Care Records */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الطفل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الوصف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المتابعة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPastoralCares.map((care) => (
                <tr key={care._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {care.child.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(care.type)}`}>
                      {getTypeText(care.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {care.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {new Date(care.date).toLocaleDateString('ar-EG')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(care.status)}`}>
                      {getStatusText(care.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {care.followUpDate ? new Date(care.followUpDate).toLocaleDateString('ar-EG') : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(care)}
                      className="text-indigo-600 hover:text-indigo-900 ml-4"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeletePastoralCare(care._id)}
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

        {filteredPastoralCares.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد سجلات مطابقة للبحث</p>
          </div>
        )}
      </div>

      {/* Add Pastoral Care Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إضافة سجل رعاية جديد</h3>
              <form onSubmit={handleAddPastoralCare} className="space-y-4">
                <div>
                  <select
                    title="اختيار الطفل"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.child}
                    onChange={(e) => setFormData({...formData, child: e.target.value})}
                    required
                  >
                    <option value="">اختر الطفل</option>
                    {children.map((child) => (
                      <option key={child._id} value={child._id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    title="نوع الرعاية"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="">اختر نوع الرعاية</option>
                    <option value="spiritual">روحية</option>
                    <option value="behavioral">سلوكية</option>
                    <option value="family">أسرية</option>
                    <option value="academic">دراسية</option>
                    <option value="health">صحية</option>
                  </select>
                </div>
                <div>
                  <textarea
                    placeholder="وصف الحالة"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right h-24 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    تاريخ الحالة
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <select
                    title="حالة المتابعة"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="pending">في الانتظار</option>
                    <option value="in-progress">قيد المتابعة</option>
                    <option value="resolved">تم الحل</option>
                    <option value="follow-up">متابعة مطلوبة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    تاريخ المتابعة (اختياري)
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({...formData, followUpDate: e.target.value})}
                  />
                </div>
                <div>
                  <textarea
                    placeholder="ملاحظات إضافية (اختياري)"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right h-20 resize-none"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
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

      {/* Edit Pastoral Care Modal */}
      {editingCare && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">تعديل سجل الرعاية</h3>
              <form onSubmit={handleEditPastoralCare} className="space-y-4">
                <div>
                  <select
                    title="اختيار الطفل"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.child}
                    onChange={(e) => setFormData({...formData, child: e.target.value})}
                    required
                  >
                    <option value="">اختر الطفل</option>
                    {children.map((child) => (
                      <option key={child._id} value={child._id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    title="نوع الرعاية"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="">اختر نوع الرعاية</option>
                    <option value="spiritual">روحية</option>
                    <option value="behavioral">سلوكية</option>
                    <option value="family">أسرية</option>
                    <option value="academic">دراسية</option>
                    <option value="health">صحية</option>
                  </select>
                </div>
                <div>
                  <textarea
                    placeholder="وصف الحالة"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right h-24 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    تاريخ الحالة
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <select
                    title="حالة المتابعة"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="pending">في الانتظار</option>
                    <option value="in-progress">قيد المتابعة</option>
                    <option value="resolved">تم الحل</option>
                    <option value="follow-up">متابعة مطلوبة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    تاريخ المتابعة (اختياري)
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({...formData, followUpDate: e.target.value})}
                  />
                </div>
                <div>
                  <textarea
                    placeholder="ملاحظات إضافية (اختياري)"
                    className="w-full p-3 border border-gray-300 rounded-lg text-right h-20 resize-none"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
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
                    onClick={() => setEditingCare(null)}
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
