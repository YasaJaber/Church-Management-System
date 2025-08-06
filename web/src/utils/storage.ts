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
      cookieExpires: 7,
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      sameSite: 'Lax'
    })
    
    // Also set legacy token name for compatibility
    this.setItem('userToken', token, {
      cookieExpires: 7,
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      sameSite: 'Lax'
    })
  }

  static getAuthToken(): string | null {
    return this.getItem('auth_token') || this.getItem('userToken')
  }

  static setUserData(userData: any): void {
    try {
      const jsonData = JSON.stringify(userData)
      this.setItem('user_data', jsonData)
    } catch (error) {
      console.warn('⚠️ Failed to stringify user data:', error)
    }
  }

  static getUserData(): any | null {
    try {
      const jsonData = this.getItem('user_data')
      return jsonData ? JSON.parse(jsonData) : null
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
}

// Export for backward compatibility
export const storage = EnhancedStorage
export default EnhancedStorage
