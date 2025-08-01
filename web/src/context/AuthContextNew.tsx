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
      const token = Cookies.get('auth_token') || localStorage.getItem('auth_token')
      
      if (!token) {
        setIsLoading(false)
        return false
      }

      const response = await authAPI.getCurrentUser()
      
      if (response.data && response.data.user) {
        setUser(response.data.user)
        setIsAuthenticated(true)
        setIsLoading(false)
        return true
      } else {
        // Invalid token, clear it
        Cookies.remove('auth_token')
        localStorage.removeItem('auth_token')
        setUser(null)
        setIsAuthenticated(false)
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      // Clear invalid tokens
      Cookies.remove('auth_token')
      localStorage.removeItem('auth_token')
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
      
      const response = await authAPI.login({
        username: credentials.username,
        password: credentials.password
      })

      if (response && response.success) {
        const { user, token } = response
        
        // Store token
        if (credentials.rememberMe) {
          Cookies.set('auth_token', token, { expires: 30 }) // 30 days
        } else {
          Cookies.set('auth_token', token, { expires: 1 }) // 1 day
        }
        localStorage.setItem('auth_token', token)
        
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
        setIsLoading(false)
        return {
          success: false,
          message: response?.message || 'فشل في تسجيل الدخول',
          user: {} as User,
          token: ''
        }
      }
    } catch (error: any) {
      setIsLoading(false)
      console.error('Login error:', error)
      
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
      // Clear tokens
      Cookies.remove('auth_token')
      localStorage.removeItem('auth_token')
      
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
