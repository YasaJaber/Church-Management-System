'use client'

import { Component, ReactNode } from 'react'
import logger from '@/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string
}


class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error for debugging
    logger.error('❌ Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })

    this.setState({
      errorInfo: errorInfo.componentStack || ''
    })
  }

  handleReload = (): void => {
    // Clear the error state and reload
    this.setState({
      hasError: false,
      error: null,
      errorInfo: ''
    })
    window.location.reload()
  }

  handleGoHome = (): void => {
    // Clear the error state and go to home
    this.setState({
      hasError: false,
      error: null,
      errorInfo: ''
    })
    window.location.href = '/dashboard'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div 
          className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4"
          dir="rtl"
        >
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg 
                className="w-10 h-10 text-red-600 dark:text-red-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>

            {/* Error Message */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              حدث خطأ غير متوقع
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              نعتذر عن هذا الخطأ. يمكنك إعادة تحميل الصفحة أو العودة للصفحة الرئيسية.
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-right">
                <p className="text-sm font-mono text-red-700 dark:text-red-300 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                إعادة تحميل الصفحة
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                  />
                </svg>
                الصفحة الرئيسية
              </button>
            </div>

            {/* Support Info */}
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
