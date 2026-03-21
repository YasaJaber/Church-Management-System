'use client'

import { useEffect, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ImageModalProps {
  isOpen: boolean
  imageUrl: string | null
  alt?: string
  childName?: string
  onClose: () => void
}

export default function ImageModal({
  isOpen,
  imageUrl,
  alt,
  childName,
  onClose,
}: ImageModalProps) {
  const displayName = alt || childName || 'صورة'
  // Handle escape key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  // Add/remove event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen || !imageUrl) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
        title="إغلاق"
      >
        <XMarkIcon className="w-6 h-6 text-white" />
      </button>

      {/* Image container */}
      <div
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={displayName}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          loading="lazy"
        />
      </div>

      {/* Caption */}
      {displayName && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
          {displayName}
        </div>
      )}
    </div>
  )
}
