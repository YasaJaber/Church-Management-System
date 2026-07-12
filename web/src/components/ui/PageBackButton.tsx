'use client'

import { useRouter } from 'next/navigation'

interface PageBackButtonProps {
  href?: string
  className?: string
}

export default function PageBackButton({
  href = '/dashboard',
  className = '',
}: PageBackButtonProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white ${className}`}
      aria-label="العودة للوحة التحكم"
    >
      <span aria-hidden="true">←</span>
      <span>العودة</span>
    </button>
  )
}
