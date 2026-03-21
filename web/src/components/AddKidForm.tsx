'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import {
  CameraIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { kidsAPI } from '@/services/api'

interface AddKidFormProps {
  onSuccess?: (kid: any) => void
  onCancel?: () => void
}

export default function AddKidForm({ onSuccess, onCancel }: AddKidFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection (from gallery)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملف صورة صالح')
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن يكون أقل من 10 ميجابايت')
        return
      }

      setImageFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  // Remove selected image
  const handleRemoveImage = useCallback(() => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم الطفل')
      return
    }

    setIsUploading(true)

    try {
      const submitData = new FormData()
      submitData.append('name', formData.name.trim())
      submitData.append('phone', formData.phone.trim())
      submitData.append('notes', formData.notes.trim())

      if (imageFile) {
        submitData.append('image', imageFile)
      }

      const response = await kidsAPI.addKid(submitData)

      if (response.success) {
        toast.success('تم إضافة الطفل بنجاح')

        // Reset form
        setFormData({ name: '', phone: '', notes: '' })
        handleRemoveImage()

        // Call success callback
        if (onSuccess) {
          onSuccess(response.data)
        }
      } else {
        toast.error(response.error || 'فشل في إضافة الطفل')
      }
    } catch (error) {
      console.error('Error adding kid:', error)
      toast.error('حدث خطأ في إضافة الطفل')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Upload Section */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          صورة الطفل
        </label>

        {/* Image Preview */}
        {imagePreview ? (
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="معاينة الصورة"
              className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
              title="إزالة الصورة"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Camera Capture Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <CameraIcon className="w-6 h-6 text-gray-500" />
              <span className="text-gray-600">التقاط صورة</span>
            </button>

            {/* Gallery Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <PhotoIcon className="w-6 h-6 text-gray-500" />
              <span className="text-gray-600">اختيار من المعرض</span>
            </button>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="text-xs text-gray-500">
          الحد الأقصى لحجم الصورة: 10 ميجابايت. الصيغ المدعومة: JPEG, PNG, GIF, WebP
        </p>
      </div>

      {/* Name Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          اسم الطفل *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="أدخل اسم الطفل"
          disabled={isUploading}
        />
      </div>

      {/* Phone Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          رقم الهاتف
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => {
            const cleanedPhone = e.target.value.replace(/[^\d\+\-\(\)\s]/g, '')
            if (cleanedPhone.length <= 20) {
              setFormData({ ...formData, phone: cleanedPhone })
            }
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="رقم الهاتف (اختياري)"
          maxLength={20}
          disabled={isUploading}
        />
      </div>

      {/* Notes Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ملاحظات
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => {
            if (e.target.value.length <= 500) {
              setFormData({ ...formData, notes: e.target.value })
            }
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          placeholder="أي ملاحظات إضافية (اختياري)"
          maxLength={500}
          disabled={isUploading}
        />
        {formData.notes && (
          <p className="text-xs text-gray-500 mt-1">
            {formData.notes.length}/500 حرف
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={isUploading}
          >
            إلغاء
          </button>
        )}
        <button
          type="submit"
          disabled={isUploading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>جاري الرفع...</span>
            </>
          ) : (
            <>
              <ArrowUpTrayIcon className="w-5 h-5" />
              <span>إضافة الطفل</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
