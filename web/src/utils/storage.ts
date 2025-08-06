/**
 * Enhanced storage utilities for better mobile compatibility
 * Handles both localStorage and cookies with fallbacks
 */

import Cookies from 'js-cookie'

export interface StorageOptions {
  cookieExpires?: number // days
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  path?: string
}

export class EnhancedStorage {
  private static isAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      if (typeof window === 'undefined') return false
      const storage = window[type]
      const x = '__storage_test__'
      storage.setItem(x, x)
      storage.removeItem(x)
      return true
    } catch {
      return false
    }
  }

  static setItem(key: string, value: string, options: StorageOptions = {}): void {
    const {
      cookieExpires = 7,
      secure = typeof window !== 'undefined' && window.location.protocol === 'https:',
      sameSite = 'Lax',
      path = '/'
    } = options

    try {
      // 1. Try localStorage first
      if (this.isAvailable('localStorage')) {
        localStorage.setItem(key, value)
        console.log(`✅ Stored ${key} in localStorage`)
      }
    } catch (error) {
      console.warn(`⚠️ Failed to store ${key} in localStorage:`, error)
    }

    try {
      // 2. Always store in cookies as backup
      Cookies.set(key, value, {
        expires: cookieExpires,
        secure,
        sameSite,
        path
      })
      console.log(`✅ Stored ${key} in cookies`)
    } catch (error) {
      console.warn(`⚠️ Failed to store ${key} in cookies:`, error)
    }
  }

  static getItem(key: string): string | null {
    let value: string | null = null

    // 1. Try cookies first (more reliable on mobile)
    try {
      value = Cookies.get(key) || null
      if (value) {
        console.log(`✅ Retrieved ${key} from cookies`)
        return value
      }
    } catch (error) {
      console.warn(`⚠️ Failed to retrieve ${key} from cookies:`, error)
    }

    // 2. Try localStorage as fallback
    try {
      if (this.isAvailable('localStorage')) {
        value = localStorage.getItem(key)
        if (value) {
          console.log(`✅ Retrieved ${key} from localStorage`)
          return value
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to retrieve ${key} from localStorage:`, error)
    }

    console.log(`❌ Could not retrieve ${key} from any storage`)
    return null
  }

  static removeItem(key: string): void {
    // Remove from localStorage
    try {
      if (this.isAvailable('localStorage')) {
        localStorage.removeItem(key)
        console.log(`✅ Removed ${key} from localStorage`)
      }
    } catch (error) {
      console.warn(`⚠️ Failed to remove ${key} from localStorage:`, error)
    }

    // Remove from cookies
    try {
      Cookies.remove(key, { path: '/' })
      console.log(`✅ Removed ${key} from cookies`)
    } catch (error) {
      console.warn(`⚠️ Failed to remove ${key} from cookies:`, error)
    }
  }

  static clear(): void {
    // Clear localStorage
    try {
      if (this.isAvailable('localStorage')) {
        localStorage.clear()
        console.log('✅ Cleared localStorage')
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear localStorage:', error)
    }

    // Clear authentication cookies
    const authKeys = ['auth_token', 'userToken', 'user_data']
    authKeys.forEach(key => {
      try {
        Cookies.remove(key, { path: '/' })
      } catch (error) {
        console.warn(`⚠️ Failed to remove cookie ${key}:`, error)
      }
    })
    console.log('✅ Cleared authentication cookies')
  }

  // Specific methods for auth tokens
  static setAuthToken(token: string): void {
    this.setItem('auth_token', token, {
      cookieExpires: 30, // 30 days instead of 7
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      sameSite: 'Lax'
    })
    
    // Also set legacy token name for compatibility
    this.setItem('userToken', token, {
      cookieExpires: 30, // 30 days instead of 7
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      sameSite: 'Lax'
    })
  }

  static getAuthToken(): string | null {
    return this.getItem('auth_token') || this.getItem('userToken')
  }

  static setUserData(userData: any): void {
    try {
      // Add last login time to user data
      const userDataWithTimestamp = {
        ...userData,
        lastLoginTime: new Date().toISOString()
      }
      const jsonData = JSON.stringify(userDataWithTimestamp)
      this.setItem('user_data', jsonData, {
        cookieExpires: 30, // 30 days for user data too
        secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
        sameSite: 'Lax'
      })
    } catch (error) {
      console.warn('⚠️ Failed to stringify user data:', error)
    }
  }

  static getUserData(): any | null {
    try {
      const jsonData = this.getItem('user_data')
      if (!jsonData) return null
      
      const userData = JSON.parse(jsonData)
      
      // Check if data is too old (more than 30 days)
      if (userData.lastLoginTime) {
        const lastLogin = new Date(userData.lastLoginTime)
        const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysSinceLogin > 30) {
          console.log('🗓️ User data is too old, clearing...')
          this.clearAuth()
          return null
        }
      }
      
      return userData
    } catch (error) {
      console.warn('⚠️ Failed to parse user data:', error)
      return null
    }
  }

  static clearAuth(): void {
    const authKeys = ['auth_token', 'userToken', 'user_data']
    authKeys.forEach(key => this.removeItem(key))
    console.log('🧹 Cleared all authentication data')
  }

  // Check if user session is still valid (not too old)
  static isSessionValid(): boolean {
    try {
      const userData = this.getUserData()
      if (!userData || !userData.lastLoginTime) return false
      
      const lastLogin = new Date(userData.lastLoginTime)
      const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
      
      return daysSinceLogin <= 30 // Valid for 30 days
    } catch (error) {
      console.warn('⚠️ Error checking session validity:', error)
      return false
    }
  }

  // Update last activity time to keep session fresh
  static updateActivity(): void {
    try {
      const userData = this.getUserData()
      if (userData) {
        userData.lastActivity = new Date().toISOString()
        this.setUserData(userData)
      }
    } catch (error) {
      console.warn('⚠️ Error updating activity:', error)
    }
  }
}

// Export for backward compatibility
export const storage = EnhancedStorage
export default EnhancedStorage
