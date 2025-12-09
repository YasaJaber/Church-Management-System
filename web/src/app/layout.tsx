import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContextSimple'
import { NotificationProvider } from '@/context/NotificationContext'
import { ThemeProvider } from '@/context/ThemeContext'
import ThemeToggle from '@/components/ui/ThemeToggle'
import ErrorBoundary from '@/components/ErrorBoundary'
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

// Script to prevent flash of unstyled content
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
        <ThemeProvider>
          <ErrorBoundary>
            <AuthProvider>
              <NotificationProvider>
                {children}
                <ThemeToggle />
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
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
