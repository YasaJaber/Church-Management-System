'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { CheckCircleIcon, XCircleIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'

interface ServantsAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  servant: {
    _id: string
    name: string
    phone?: string
    role?: string
    hasAttendanceRecord?: boolean
    isPresent?: boolean
    notes?: string
  }
  onSave: (servantId: string, status: 'present' | 'absent', notes?: string) => Promise<void>
  onDelete?: (servantId: string) => Promise<void>
}

export default function ServantsAttendanceModal({ 
  isOpen, 
  onClose, 
  servant, 
  onSave, 
  onDelete 
}: ServantsAttendanceModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<'present' | 'absent' | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!isOpen) return null

  // تعيين القيم الحالية عند فتح المودال
  const currentStatus = servant.hasAttendanceRecord ? (servant.isPresent ? 'present' : 'absent') : null
  const currentNotes = servant.notes || ''

  // إذا لم يتم تعيين حالة مسبقاً، استخدم الحالة الحالية
  const effectiveStatus = selectedStatus !== null ? selectedStatus : currentStatus
  const effectiveNotes = notes || currentNotes

  const handleSave = async () => {
    if (!selectedStatus) {
      toast.error('يرجى تحديد حالة الحضور')
      return
    }

    setSaving(true)
    try {
      await onSave(servant._id, selectedStatus, notes.trim() || undefined)
      toast.success(`تم تسجيل ${selectedStatus === 'present' ? 'الحضور' : 'الغياب'} بنجاح`)
      handleClose()
    } catch (error) {
      console.error('Error saving servant attendance:', error)
      toast.error('حدث خطأ في تسجيل الحضور')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!servant.hasAttendanceRecord || !onDelete) return

    const confirmed = window.confirm(
      `هل أنت متأكد من مسح تسجيل الحضور لـ ${servant.name}؟\nسيتم إلغاء تسجيل الحضور/الغياب وسيعود الخادم إلى حالة "لم يُسجل".`
    )
    
    if (!confirmed) return

    setDeleting(true)
    try {
      await onDelete(servant._id)
      toast.success('تم مسح تسجيل الحضور بنجاح')
      handleClose()
    } catch (error) {
      console.error('Error deleting servant attendance:', error)
      toast.error('حدث خطأ في مسح تسجيل الحضور')
    } finally {
      setDeleting(false)
    }
  }

  const handleClose = () => {
    setSelectedStatus(null)
    setNotes('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">تسجيل حضور الخادم</h3>
            {servant.hasAttendanceRecord && (
              <p className="text-sm text-gray-600">
                الحالة الحالية: <span className={`font-medium ${servant.isPresent ? 'text-green-600' : 'text-red-600'}`}>
                  {servant.isPresent ? 'حاضر' : 'غائب'}
                </span>
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving || deleting}
            title="إغلاق"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Servant Info */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900">{servant.name}</div>
            {servant.role && (
              <div className="text-sm text-gray-600 mt-1">{servant.role}</div>
            )}
            {servant.phone && (
              <div className="text-sm text-gray-500 mt-1">📞 {servant.phone}</div>
            )}
          </div>
        </div>

        {/* Status Selection */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Present Button */}
            <button
              onClick={() => setSelectedStatus('present')}
              disabled={saving || deleting}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                effectiveStatus === 'present'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
              } disabled:opacity-50`}
            >
              <div className="flex flex-col items-center">
                <CheckCircleIcon className="w-8 h-8 mb-2" />
                <span className="font-medium">حاضر</span>
              </div>
              {effectiveStatus === 'present' && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>

            {/* Absent Button */}
            <button
              onClick={() => setSelectedStatus('absent')}
              disabled={saving || deleting}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                effectiveStatus === 'absent'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
              } disabled:opacity-50`}
            >
              <div className="flex flex-col items-center">
                <XCircleIcon className="w-8 h-8 mb-2" />
                <span className="font-medium">غائب</span>
              </div>
              {effectiveStatus === 'absent' && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ملاحظات (اختياري)
          </label>
          <textarea
            value={effectiveNotes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving || deleting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            rows={3}
            placeholder={
              effectiveStatus === 'absent' 
                ? 'سبب الغياب (مرض، سفر، عذر شرعي، إلخ...)'
                : 'أي ملاحظات إضافية...'
            }
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!selectedStatus || saving || deleting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'جاري الحفظ...' : 'تسجيل'}
          </button>
          
          {/* زر مسح الحضور - يظهر فقط إذا كان الخادم له تسجيل حضور */}
          {servant.hasAttendanceRecord && onDelete && (
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              title="مسح تسجيل الحضور"
            >
              <TrashIcon className="w-4 h-4" />
              {deleting ? 'جاري المسح...' : 'مسح'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
