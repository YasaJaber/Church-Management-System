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

  // Check authentication status
  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = Cookies.get('auth_token') || Cookies.get('userToken') || 
                   localStorage.getItem('auth_token') || localStorage.getItem('userToken')
      
      if (!token) {
        setIsLoading(false)
        return false
      }

      const response = await authAPI.getCurrentUser()
      
      if (response.success && response.data && response.data.user) {
        setUser(response.data.user)
        setIsAuthenticated(true)
        setIsLoading(false)
        return true
      } else {
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
      console.error('Auth check failed:', error)
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
    try {
      setIsLoading(true)
      console.log('🔑 محاولة تسجيل دخول للمستخدم:', credentials.username)
      
      const response = await authAPI.login({
        username: credentials.username,
        password: credentials.password
      })

      console.log('📥 رد من الـ API:', response)

      if (response && response.success) {
        const { user, token } = response.data // البيانات في response.data
        
        console.log('✅ تسجيل دخول ناجح:', user)
        console.log('🔑 الرمز المميز:', token)
        
        // Store token with both names for compatibility
        if (credentials.rememberMe) {
          Cookies.set('auth_token', token, { expires: 30 }) // 30 days
          Cookies.set('userToken', token, { expires: 30 }) // Legacy support
        } else {
          Cookies.set('auth_token', token, { expires: 1 }) // 1 day
          Cookies.set('userToken', token, { expires: 1 }) // Legacy support
        }
        localStorage.setItem('auth_token', token)
        localStorage.setItem('userToken', token) // Legacy support
        
        // Update state
        setUser(user)
        setIsAuthenticated(true)
        setIsLoading(false)
        
        return {
          success: true,
          message: response.message || 'تم تسجيل الدخول بنجاح',
          user,
          token
        }
      } else {
        console.log('❌ فشل تسجيل الدخول:', response)
        setIsLoading(false)
        return {
          success: false,
          message: response?.message || response?.error || 'فشل في تسجيل الدخول',
          user: {} as User,
          token: ''
        }
      }
    } catch (error: any) {
      setIsLoading(false)
      console.error('❌ خطأ في تسجيل الدخول:', error)
      
      const errorMessage = error.message || 
                          'حدث خطأ أثناء تسجيل الدخول'
      
      return {
        success: false,
        message: errorMessage,
        user: {} as User,
        token: ''
      }
    }
  }

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Clear all tokens (both legacy and new)
      Cookies.remove('auth_token')
      Cookies.remove('userToken')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('userToken')
      
      // Reset state
      setUser(null)
      setIsAuthenticated(false)
      
      toast.success('تم تسجيل الخروج بنجاح')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('حدث خطأ أثناء تسجيل الخروج')
    }
  }

  // Check auth on mount
  useEffect(() => {
    console.log('🔄 AuthProvider: Checking authentication...')
    checkAuth()
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  }

  console.log('🔐 AuthProvider state:', {
    isLoading,
    isAuthenticated,
    hasUser: !!user,
    username: user?.username
  })

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
