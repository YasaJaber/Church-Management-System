'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI } from '@/services/api'
import { toast } from 'react-hot-toast'
import { User, LoginCredentials, LoginResponse } from '@/types/User'
import { EnhancedStorage } from '@/utils/storage'

// Simple AuthContext interface
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<LoginResponse>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Enhanced auth check with better mobile support
  const checkAuth = async (): Promise<boolean> => {
    console.log('🔍 AuthContext: بدء التحقق من المصادقة...')
    
    try {
      // Try multiple token sources with priority order
      let token = null
      let userDataFromStorage = null
      
      // Get token using enhanced storage
      token = EnhancedStorage.getAuthToken()
      console.log('� AuthContext: التوكن النهائي:', token ? 'موجود' : 'غير موجود')
      
      // Get cached user data
      userDataFromStorage = EnhancedStorage.getUserData()
      if (userDataFromStorage) {
        console.log('👤 Cached user data found:', userDataFromStorage?.username)
      }
      
      if (!token) {
        console.log('❌ AuthContext: لا يوجد توكن - إعداد حالة غير مصادق')
        setIsLoading(false)
        setIsAuthenticated(false)
        setUser(null)
        return false
      }

      console.log('📡 AuthContext: طلب التحقق من المستخدم الحالي...')
      
      // If we have cached user data, set it immediately for faster UI
      if (userDataFromStorage) {
        console.log('⚡ Setting cached user data for faster load')
        setUser(userDataFromStorage)
        setIsAuthenticated(true)
      }
      
      // Direct fetch call to avoid any service layer issues
      const response = await fetch('https://church-management-system-b6h7.onrender.com/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
      
      const data = await response.json()
      console.log('📥 AuthContext: استجابة التحقق:', data)
      
      if (response.ok && data.success && data.data && data.data.user) {
        console.log('✅ AuthContext: تم التحقق بنجاح من المستخدم:', data.data.user)
        
        // Update user data and cache it
        setUser(data.data.user)
        setIsAuthenticated(true)
        setIsLoading(false)
        
        // Update cached user data
        EnhancedStorage.setUserData(data.data.user)
        
        return true
      } else {
        console.log('❌ AuthContext: فشل التحقق - مسح التوكن والبيانات')
        // Invalid token, clear everything
        EnhancedStorage.clearAuth()
        setUser(null)
        setIsAuthenticated(false)
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error('❌ AuthContext: فشل التحقق من المصادقة:', error)
      
      // On network error, if we have cached user data, use it temporarily
      try {
        const cachedUserData = EnhancedStorage.getUserData()
        if (cachedUserData) {
          console.log('🔄 Network error but using cached user data temporarily')
          setUser(cachedUserData)
          setIsAuthenticated(true)
          setIsLoading(false)
          return true
        }
      } catch (storageError) {
        console.warn('⚠️ Could not access cached user data')
      }
      
      // Otherwise clear everything
      EnhancedStorage.clearAuth()
      setUser(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      return false
    }
  }

  // Login function
  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    console.log('🔐 AuthContext: محاولة تسجيل الدخول...', credentials.username)
    
    try {
      setIsLoading(true)
      const response = await authAPI.login(credentials)
      
      if (response.success && response.data) {
        const { user, token } = response.data
        
        // Store token and user data using enhanced storage
        EnhancedStorage.setAuthToken(token)
        EnhancedStorage.setUserData(user)
        
        setUser(user)
        setIsAuthenticated(true)
        setIsLoading(false)
        
        console.log('✅ AuthContext: تم تسجيل الدخول بنجاح')
        toast.success(`مرحباً ${user.username}!`)
        
        return response
      } else {
        console.log('❌ AuthContext: فشل تسجيل الدخول')
        setIsLoading(false)
        const errorMessage = response.message || 'فشل في تسجيل الدخول'
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      console.error('❌ AuthContext: خطأ في تسجيل الدخول:', error)
      setIsLoading(false)
      const errorMessage = error.response?.data?.message || error.message || 'فشل في تسجيل الدخول'
      toast.error(errorMessage)
      throw error
    }
  }

  // Enhanced logout function
  const logout = async (): Promise<void> => {
    console.log('🚪 AuthContext: تسجيل الخروج...')
    
    try {
      // Clear all authentication data using enhanced storage
      EnhancedStorage.clearAuth()
      
      // Reset state
      setUser(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      
      console.log('✅ AuthContext: تم تسجيل الخروج بنجاح')
      toast.success('تم تسجيل الخروج بنجاح')
    } catch (error) {
      console.error('❌ AuthContext: خطأ في تسجيل الخروج:', error)
    }
  }

  // Initialize auth check on mount with enhanced persistence
  useEffect(() => {
    console.log('🚀 AuthContext: تشغيل useEffect للتحقق الأولي...')
    
    const initAuth = async () => {
      try {
        await checkAuth()
      } catch (error) {
        console.error('❌ AuthContext: خطأ في التحقق الأولي:', error)
        setIsLoading(false)
      }
    }

    initAuth()

    // Set up periodic auth check for mobile reliability (every 5 minutes)
    const authCheckInterval = setInterval(async () => {
      if (isAuthenticated) {
        console.log('🔄 Periodic auth check...')
        try {
          await checkAuth()
        } catch (error) {
          console.warn('⚠️ Periodic auth check failed:', error)
        }
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Add visibility change listener for mobile apps
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        console.log('📱 App became visible, checking auth...')
        checkAuth()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(authCheckInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []) // Empty dependency array for initial setup only

  // Separate effect for auth state changes to avoid infinite loops
  useEffect(() => {
    if (isAuthenticated) {
      // Set up interval only when authenticated
      const authCheckInterval = setInterval(async () => {
        console.log('🔄 Periodic auth check for authenticated user...')
        try {
          await checkAuth()
        } catch (error) {
          console.warn('⚠️ Periodic auth check failed:', error)
        }
      }, 5 * 60 * 1000) // 5 minutes

      return () => clearInterval(authCheckInterval)
    }
  }, [isAuthenticated])

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔄 AuthContext: تغيير في الحالة:', {
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      username: user?.username
    })
  }, [isLoading, isAuthenticated, user])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
