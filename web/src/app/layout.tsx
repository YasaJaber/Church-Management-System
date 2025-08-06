import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'كنيسة الشهيد مار جرجس - بأولاد علي - نظام إدارة الكنيسة',
  description: 'نظام إدارة شئون الكنيسة والأطفال والخدام',
  keywords: ['كنيسة', 'إدارة', 'أطفال', 'خدام', 'حضور'],
  authors: [{ name: 'Church Management Team' }],
  icons: {
    icon: '/saint-george.png',
    shortcut: '/saint-george.png',
    apple: '/saint-george.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          <NotificationProvider>
            {children}
            <Toaster 
              position="top-center"
              reverseOrder={false}
              gutter={8}
              containerClassName=""
              containerStyle={{}}
              toastOptions={{
                className: '',
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  fontFamily: 'Tajawal',
                  direction: 'rtl',
                },
                success: {
                  duration: 3000,
                  style: {
                    background: '#10B981',
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: '#EF4444',
                  },
                },
              }}
            />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
