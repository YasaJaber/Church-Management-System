'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI } from '@/services/api'
import { toast } from 'react-hot-toast'
import { User, LoginCredentials, LoginResponse } from '@/types/User'
import { EnhancedStorage } from '@/utils/storage'

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

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const checkAuth = async (): Promise<boolean> => {
    console.log('🔍 AuthContext: بدء التحقق من المصادقة...')
    
    try {
      const token = EnhancedStorage.getAuthToken()
      const userDataFromStorage = EnhancedStorage.getUserData()
      
      console.log('🔑 AuthContext: التوكن:', token ? 'موجود' : 'غير موجود')
      
      if (!token) {
        console.log('❌ AuthContext: لا يوجد توكن')
        setIsLoading(false)
        setIsAuthenticated(false)
        setUser(null)
        return false
      }

      if (userDataFromStorage) {
        console.log('⚡ استخدام البيانات المحفوظة - البقاء مسجلاً:', userDataFromStorage?.username)
        setUser(userDataFromStorage)
        setIsAuthenticated(true)
        setIsLoading(false)
        
        // التحقق في الخلفية
        verifyTokenInBackground(token)
        
        return true
      }

      console.log('📡 AuthContext: التحقق من الخادم...')
      const isValid = await verifyTokenWithAPI(token)
      
      return isValid
      
    } catch (error) {
      console.error('❌ AuthContext: فشل التحقق:', error)
      
      const cachedUserData = EnhancedStorage.getUserData()
      const cachedToken = EnhancedStorage.getAuthToken()
      
      if (cachedUserData && cachedToken) {
        console.log('🔄 استخدام البيانات المحفوظة رغم الخطأ')
        setUser(cachedUserData)
        setIsAuthenticated(true)
        setIsLoading(false)
        return true
      }
      
      EnhancedStorage.clearAuth()
      setUser(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      return false
    }
  }

  const verifyTokenWithAPI = async (token: string): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch('https://church-management-system-b6h7.onrender.com/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const data = await response.json()
      
      if (response.ok && data.success && data.data && data.data.user) {
        console.log('✅ AuthContext: تم التحقق بنجاح')
        
        setUser(data.data.user)
        setIsAuthenticated(true)
        setIsLoading(false)
        
        EnhancedStorage.setUserData(data.data.user)
        
        return true
      } else {
        console.log('❌ AuthContext: توكن غير صالح')
        EnhancedStorage.clearAuth()
        setUser(null)
        setIsAuthenticated(false)
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error('❌ فشل التحقق من API:', error)
      setIsLoading(false)
      return false
    }
  }

  const verifyTokenInBackground = async (token: string) => {
    try {
      console.log('🔄 التحقق في الخلفية...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const response = await fetch('https://church-management-system-b6h7.onrender.com/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data && data.data.user) {
          console.log('✅ التحقق في الخلفية نجح')
          EnhancedStorage.setUserData(data.data.user)
          setUser(data.data.user)
        }
      } else if (response.status === 401) {
        console.log('🚨 التوكن منتهي الصلاحية')
        logout()
      }
    } catch (error: any) {
      console.log('⚠️ فشل التحقق في الخلفية:', error.name)
    }
  }

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    console.log('🔐 AuthContext: محاولة تسجيل الدخول...', credentials.username)
    
    try {
      setIsLoading(true)
      const response = await authAPI.login(credentials)
      
      if (response.success && response.data) {
        const { user, token } = response.data
        
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

  const logout = async (): Promise<void> => {
    console.log('🚪 AuthContext: تسجيل الخروج...')
    
    try {
      EnhancedStorage.clearAuth()
      
      setUser(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      
      console.log('✅ AuthContext: تم تسجيل الخروج بنجاح')
      toast.success('تم تسجيل الخروج بنجاح')
    } catch (error) {
      console.error('❌ AuthContext: خطأ في تسجيل الخروج:', error)
    }
  }

  useEffect(() => {
    console.log('🚀 AuthContext: التحقق الأولي...')
    
    const initAuth = async () => {
      try {
        await checkAuth()
      } catch (error) {
        console.error('❌ AuthContext: خطأ في التحقق الأولي:', error)
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    const authCheckInterval = setInterval(async () => {
      console.log('🔄 فحص دوري للمصادقة...')
      const token = EnhancedStorage.getAuthToken()
      
      if (token) {
        verifyTokenInBackground(token)
      }
    }, 30 * 60 * 1000) // 30 دقيقة

    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        console.log('📱 التطبيق أصبح مرئياً - فحص المصادقة...')
        const token = EnhancedStorage.getAuthToken()
        
        if (token) {
          verifyTokenInBackground(token)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(authCheckInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated])

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
