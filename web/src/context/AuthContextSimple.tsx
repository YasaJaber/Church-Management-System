'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { API_BASE_URL } from '@/services/api'
import { toast } from 'react-hot-toast'
import { EnhancedStorage } from '@/utils/storage'
import { collectDeviceInfo, getDeviceInfoSummary } from '@/utils/deviceInfo'

interface User {
  _id: string
  name: string
  username: string
  role: string
  phone?: string
  assignedClass?: any
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: { username: string; password: string }) => Promise<any>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = EnhancedStorage.getAuthToken()
      if (!token) {
        setIsLoading(false)
        setIsAuthenticated(false)
        setUser(null)
        return false
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok && data.success && data.data && data.data.user) {
        setUser(data.data.user)
        setIsAuthenticated(true)
        setIsLoading(false)
        EnhancedStorage.setUserData(data.data.user)
        return true
      } else {
        EnhancedStorage.clearAuth()
        setUser(null)
        setIsAuthenticated(false)
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      const cachedUserData = EnhancedStorage.getUserData()
      if (cachedUserData) {
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

  const login = async (credentials: { username: string; password: string }) => {
    try {
      setIsLoading(true)
      
      // جمع معلومات الجهاز قبل إرسال الـ request
      let deviceInfo = null
      try {
        const rawDeviceInfo = await collectDeviceInfo()
        const summary = getDeviceInfoSummary(rawDeviceInfo)
        deviceInfo = {
          deviceType: summary.deviceType,
          browser: summary.browser,
          os: summary.os,
          isMobile: rawDeviceInfo.maxTouchPoints > 0 || summary.deviceType === 'موبايل',
          screenResolution: summary.screenResolution,
          windowSize: `${rawDeviceInfo.windowWidth}×${rawDeviceInfo.windowHeight}`,
          timezone: summary.timezone,
          language: summary.language,
          connectionType: summary.connection,
          batteryLevel: rawDeviceInfo.batteryLevel,
          batteryCharging: rawDeviceInfo.batteryCharging,
          cpuCores: rawDeviceInfo.hardwareConcurrency,
          deviceMemory: rawDeviceInfo.deviceMemory,
          touchSupport: rawDeviceInfo.maxTouchPoints > 0,
          online: rawDeviceInfo.online,
          platform: rawDeviceInfo.platform,
        }
      } catch (e) {
        console.warn('Could not collect device info:', e)
      }
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...credentials,
          deviceInfo,
        })
      })

      const data = await response.json()

      if (response.ok && data.success && data.data) {
        const { user, token } = data.data

        EnhancedStorage.setAuthToken(token)
        EnhancedStorage.setUserData(user)

        setUser(user)
        setIsAuthenticated(true)
        setIsLoading(false)

        toast.success(`مرحباً ${user.username}!`)
        return data
      } else {
        setIsLoading(false)
        const errorMessage = data.error || data.message || 'فشل في تسجيل الدخول'
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      setIsLoading(false)
      const errorMessage = error.message || 'فشل في تسجيل الدخول'
      toast.error(errorMessage)
      throw error
    }
  }

  const logout = async (): Promise<void> => {
    try {
      EnhancedStorage.clearAuth()
      setUser(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      toast.success('تم تسجيل الخروج بنجاح')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

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
