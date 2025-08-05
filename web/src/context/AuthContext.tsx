'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI } from '@/services/api'
import { toast } from 'react-hot-toast'
import Cookies from 'js-cookie'
import { User, LoginCredentials, LoginResponse } from '@/types/User'

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

  // Direct API check without using authAPI service
  const checkAuth = async (): Promise<boolean> => {
    console.log('🔍 AuthContext: بدء التحقق من المصادقة...')
    
    try {
      const token = Cookies.get('auth_token') || Cookies.get('userToken') || 
                   localStorage.getItem('auth_token') || localStorage.getItem('userToken')
      
      console.log('🔑 AuthContext: التوكن الموجود:', token ? 'موجود' : 'غير موجود')
      
      if (!token) {
        console.log('❌ AuthContext: لا يوجد توكن - إعداد حالة غير مصادق')
        setIsLoading(false)
        setIsAuthenticated(false)
        setUser(null)
        return false
      }

      console.log('📡 AuthContext: طلب التحقق من المستخدم الحالي...')
      
      // Direct fetch call to avoid any service layer issues
      const response = await fetch('http://localhost:5000/api/auth/me', {
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
        setUser(data.data.user)
        setIsAuthenticated(true)
        setIsLoading(false)
        return true
      } else {
        console.log('❌ AuthContext: فشل التحقق - مسح التوكن')
        // Invalid token, clear it
        Cookies.remove('auth_token')
        Cookies.remove('userToken')
        localStorage.removeItem('auth_token')
        localStorage.removeItem('userToken')
        setUser(null)
        setIsAuthenticated(false)
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error('❌ AuthContext: فشل التحقق من المصادقة:', error)
      // Clear invalid tokens
      Cookies.remove('auth_token')
      Cookies.remove('userToken')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('userToken')
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
        
        // Store token in both cookies and localStorage
        Cookies.set('auth_token', token, { expires: 7 })
        localStorage.setItem('auth_token', token)
        
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

  // Logout function
  const logout = async (): Promise<void> => {
    console.log('🚪 AuthContext: تسجيل الخروج...')
    
    try {
      // Clear tokens
      Cookies.remove('auth_token')
      Cookies.remove('userToken')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('userToken')
      
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

  // Initialize auth check on mount
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
  }, [])

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
