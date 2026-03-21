'use client'

import { useState } from 'react'
import { EyeIcon, PencilIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline'
import ImageModal from './ImageModal'

interface Kid {
  _id: string
  name: string
  phone?: string
  notes?: string
  image?: string | null
  thumbnail?: string | null
  optimizedImage?: string | null
}

interface KidCardProps {
  kid: Kid
  onEdit?: (kid: Kid) => void
  onDelete?: (kidId: string) => void
}

export default function KidCard({ kid, onEdit, onDelete }: KidCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Get the thumbnail URL (80x80, cropped)
  const thumbnailUrl = kid.thumbnail || kid.image

  // Get the optimized full image URL
  const fullImageUrl = kid.optimizedImage || kid.image

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        {/* Card Header with Thumbnail */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Thumbnail or Placeholder */}
            <div className="flex-shrink-0">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={kid.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shadow-sm"
                  loading="lazy"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-2 border-gray-100">
                  <UserIcon className="w-7 h-7 text-blue-500" />
                </div>
              )}
            </div>

            {/* Name and Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate text-lg">
                {kid.name}
              </h3>
              {kid.phone && (
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="inline-block ml-1">📞</span>
                  {kid.phone}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          {kid.notes && (
            <p className="mt-3 text-sm text-gray-600 line-clamp-2">
              <span className="inline-block ml-1">📝</span>
              {kid.notes}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
          {/* View Image Button */}
          {kid.image && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <EyeIcon className="w-4 h-4" />
              <span>عرض الصورة</span>
            </button>
          )}

          {/* Empty space if no image */}
          {!kid.image && <div />}

          {/* Edit & Delete Buttons */}
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(kid)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="تعديل"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(kid._id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="حذف"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isModalOpen}
        imageUrl={fullImageUrl || null}
        alt={kid.name}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
