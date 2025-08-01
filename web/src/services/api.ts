import axios from 'axios'
import Cookies from 'js-cookie'

// Base URL for the API - Use direct backend URL for now
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const LOCAL_URL = process.env.NEXT_PUBLIC_API_LOCAL || 'http://localhost:5000/api'

// Use direct backend connection temporarily
const USE_PRODUCTION_BACKEND = false

const API_BASE_URL = USE_PRODUCTION_BACKEND ? 'https://church-management-system-b6h7.onrender.com/api' : 'http://localhost:5000/api'

console.log('API Base URL:', API_BASE_URL)
console.log('Environment:', process.env.NODE_ENV)

// Create axios instance with enhanced CORS settings
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Safe storage operations for web
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key) || Cookies.get(key) || null
      }
      return null
    } catch (error) {
      console.warn(`Error getting ${key} from storage:`, error)
      return null
    }
  },
  
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value)
      }
    } catch (error) {
      console.warn(`Error setting ${key} in storage:`, error)
    }
  },
  
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
        Cookies.remove(key)
      }
    } catch (error) {
      console.warn(`Error removing ${key} from storage:`, error)
    }
  }
}

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      // Try both token names for compatibility
      let token = safeStorage.getItem('auth_token') || safeStorage.getItem('userToken')
      
      // Also try cookies as fallback
      if (!token && typeof window !== 'undefined') {
        token = Cookies.get('auth_token') || Cookies.get('userToken') || null
      }
      
      console.log('Token from storage:', token ? 'EXISTS' : 'NOT_FOUND')
      console.log('Making request to:', (config.baseURL || '') + (config.url || ''))
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        console.log('Token added to request')
      } else {
        console.log('No token found in storage or cookies')
      }
    } catch (error) {
      console.error('Error getting token from storage:', error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url)
    
    // Auto-clear cache for attendance marking to ensure fresh data
    if (response.config.url?.includes('/attendance') && response.config.method === 'post') {
      console.log('Auto-clearing statistics cache after attendance update')
      clearStatisticsCache()
    }
    
    return response
  },
  async (error) => {
    console.log(
      'API Error:',
      error.response?.status,
      error.config?.url,
      error.message
    )
    
    if (error.response?.status === 401) {
      console.log('Token expired, clearing storage')
      // Token is invalid or expired
      safeStorage.removeItem('userToken')
      safeStorage.removeItem('userData')
      
      // Redirect to login if we're on the client side
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Statistics cache management
let statisticsCache: Record<string, any> = {}

const clearStatisticsCache = () => {
  statisticsCache = {}
  console.log('Statistics cache cleared')
}

// Auth API calls
export const authAPI = {
  login: async (credentials: { username: string; password: string }) => {
    try {
      console.log('🔐 محاولة تسجيل الدخول للمستخدم:', credentials.username)
      console.log('🌐 API URL:', `${API_BASE_URL}/auth/login`)
      
      const response = await api.post('/auth/login', credentials)
      console.log('✅ تم تسجيل الدخول بنجاح:', response.data)
      return response.data
    } catch (error: any) {
      console.error('❌ خطأ في تسجيل الدخول:', error)
      console.error('📝 Response data:', error.response?.data)
      console.error('📊 Response status:', error.response?.status)
      console.error('🔍 Request config:', error.config)
      throw {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'حدث خطأ في تسجيل الدخول',
        ...error
      }
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (error: any) {
      console.error('Get current user error:', error)
      throw error
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh')
      return response.data
    } catch (error: any) {
      console.error('Refresh token error:', error)
      throw error
    }
  }
}

// Children API calls
export const childrenAPI = {
  getAll: async (filters = {}) => {
    try {
      console.log('Fetching all children with filters:', filters)
      const params = new URLSearchParams(filters as Record<string, string>)
      const response = await api.get(`/children?${params}`)
      console.log('Children fetched successfully:', response.data.length, 'children')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error fetching children:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الأطفال'
      }
    }
  },

  getAllChildren: async () => {
    return await childrenAPI.getAll()
  },

  getByClass: async (classId: string) => {
    try {
      console.log('Fetching children by class:', classId)
      const response = await api.get(`/children/class/${classId}`)
      console.log('Children by class response:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error fetching children by class:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الأطفال'
      }
    }
  },

  getById: async (id: string) => {
    try {
      const response = await api.get(`/children/${id}`)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error fetching child:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الطفل'
      }
    }
  },

  create: async (childData: any) => {
    try {
      console.log('Creating new child:', childData)
      const response = await api.post('/children', childData)
      console.log('Child created successfully:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error creating child:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في إنشاء الطفل'
      }
    }
  },

  createChild: async (childData: any) => {
    return await childrenAPI.create(childData)
  },

  update: async (id: string, childData: any) => {
    try {
      console.log('Updating child:', id, childData)
      const response = await api.put(`/children/${id}`, childData)
      console.log('Child updated successfully:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error updating child:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحديث الطفل'
      }
    }
  },

  updateChild: async (id: string, childData: any) => {
    return await childrenAPI.update(id, childData)
  },

  delete: async (id: string) => {
    try {
      console.log('Deleting child:', id)
      const response = await api.delete(`/children/${id}`)
      console.log('Child deleted successfully')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error deleting child:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في حذف الطفل'
      }
    }
  },

  deleteChild: async (id: string) => {
    return await childrenAPI.delete(id)
  }
}

// Attendance API calls
export const attendanceAPI = {
  getChildrenWithStatus: async (date: string, classId?: string) => {
    try {
      console.log('Fetching children with attendance status for date:', date, 'classId:', classId)
      const params = new URLSearchParams()
      params.append('date', date)
      if (classId) params.append('classId', classId)
      
      const response = await api.get(`/attendance/children-with-status?${params}`)
      console.log('Children with status fetched successfully:', response.data.data?.length || 0, 'children')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error fetching children with status:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب بيانات الحضور'
      }
    }
  },

  getByClass: async (classId: string, date?: string) => {
    try {
      console.log('Fetching attendance for class:', classId, 'date:', date)
      const params = new URLSearchParams()
      if (date) params.append('date', date)
      
      const response = await api.get(`/attendance/class/${classId}?${params}`)
      console.log('Attendance fetched successfully')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error fetching attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الحضور'
      }
    }
  },

  getAttendanceByDate: async (date: string, classId?: string) => {
    try {
      console.log('Fetching attendance by date:', date, 'classId:', classId)
      const params = new URLSearchParams()
      params.append('date', date)
      if (classId) params.append('classId', classId)
      
      const response = await api.get(`/attendance/children?${params}`)
      console.log('Attendance by date fetched successfully')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error fetching attendance by date:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الحضور'
      }
    }
  },

  markAttendance: async (attendanceData: any) => {
    try {
      console.log('Marking attendance:', attendanceData)
      const response = await api.post('/attendance', attendanceData)
      console.log('Attendance marked successfully')
      
      // Clear cache after marking attendance
      clearStatisticsCache()
      
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error marking attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تسجيل الحضور'
      }
    }
  },

  markAllPresent: async (classId: string, date: string) => {
    try {
      console.log('Marking all present for class:', classId, 'date:', date)
      const response = await api.post('/attendance/mark-all-present', {
        classId,
        date
      })
      console.log('All marked present successfully')
      
      // Clear cache after bulk attendance
      clearStatisticsCache()
      
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error marking all present:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تسجيل الحضور الجماعي'
      }
    }
  },

  updateAttendance: async (id: string, attendanceData: any) => {
    try {
      console.log('Updating attendance:', id, attendanceData)
      const response = await api.put(`/attendance/${id}`, attendanceData)
      console.log('Attendance updated successfully')
      
      // Clear cache after updating attendance
      clearStatisticsCache()
      
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error updating attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحديث الحضور'
      }
    }
  },

  deleteAttendance: async (childId: string, date?: string) => {
    try {
      console.log('Deleting attendance for child:', childId, 'date:', date)
      const url = date ? `/attendance/${childId}/${date}` : `/attendance/${childId}`
      const response = await api.delete(url)
      console.log('Attendance deleted successfully')
      
      // Clear cache after deleting attendance
      clearStatisticsCache()
      
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error deleting attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في حذف تسجيل الحضور'
      }
    }
  }
}

// Classes API calls
export const classesAPI = {
  getAll: async () => {
    try {
      console.log('Fetching all classes')
      const response = await api.get('/classes')
      console.log('Classes fetched successfully:', response.data.length, 'classes')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error fetching classes:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الفصول'
      }
    }
  },

  getAllClasses: async () => {
    return await classesAPI.getAll()
  },

  getById: async (id: string) => {
    try {
      const response = await api.get(`/classes/${id}`)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error fetching class:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الفصل'
      }
    }
  },

  create: async (classData: any) => {
    try {
      console.log('Creating new class:', classData)
      const response = await api.post('/classes', classData)
      console.log('Class created successfully:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error creating class:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في إنشاء الفصل'
      }
    }
  },

  update: async (id: string, classData: any) => {
    try {
      console.log('Updating class:', id, classData)
      const response = await api.put(`/classes/${id}`, classData)
      console.log('Class updated successfully:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error updating class:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحديث الفصل'
      }
    }
  },

  delete: async (id: string) => {
    try {
      console.log('Deleting class:', id)
      const response = await api.delete(`/classes/${id}`)
      console.log('Class deleted successfully')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      console.error('Error deleting class:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في حذف الفصل'
      }
    }
  }
}
// Note: classesAPI is already defined elsewhere in the file, we just need to ensure it has getAllClasses method

// Statistics API calls
export const statisticsAPI = {
  getOverview: async () => {
    try {
      const cacheKey = 'overview'
      if (statisticsCache[cacheKey]) {
        console.log('Returning cached overview statistics')
        return statisticsCache[cacheKey]
      }

      console.log('Fetching overview statistics')
      const response = await api.get('/statistics/overview')
      console.log('Overview statistics fetched successfully')
      
      statisticsCache[cacheKey] = response.data
      return response.data
    } catch (error: any) {
      console.error('Error fetching overview statistics:', error)
      throw error
    }
  },

  getClassStatistics: async (classId: string, period = 'month') => {
    try {
      const cacheKey = `class-${classId}-${period}`
      if (statisticsCache[cacheKey]) {
        console.log('Returning cached class statistics')
        return statisticsCache[cacheKey]
      }

      console.log('Fetching class statistics for:', classId, 'period:', period)
      const response = await api.get(`/statistics/class/${classId}?period=${period}`)
      console.log('Class statistics fetched successfully')
      
      statisticsCache[cacheKey] = response.data
      return response.data
    } catch (error: any) {
      console.error('Error fetching class statistics:', error)
      throw error
    }
  },

  getAttendanceTrends: async (period = 'month') => {
    try {
      const cacheKey = `trends-${period}`
      if (statisticsCache[cacheKey]) {
        console.log('Returning cached attendance trends')
        return statisticsCache[cacheKey]
      }

      console.log('Fetching attendance trends for period:', period)
      const response = await api.get(`/statistics/trends?period=${period}`)
      console.log('Attendance trends fetched successfully')
      
      statisticsCache[cacheKey] = response.data
      return response.data
    } catch (error: any) {
      console.error('Error fetching attendance trends:', error)
      throw error
    }
  }
}

// Servants/Users API calls
export const servantsAPI = {
  getAll: async () => {
    try {
      console.log('Fetching all servants')
      const response = await api.get('/servants')
      console.log('Servants fetched successfully:', response.data)
      return response.data
    } catch (error: any) {
      console.error('Error fetching servants:', error)
      throw error
    }
  },

  getById: async (id: string) => {
    try {
      const response = await api.get(`/servants/${id}`)
      return response.data
    } catch (error: any) {
      console.error('Error fetching servant:', error)
      throw error
    }
  },

  create: async (userData: any) => {
    try {
      console.log('Creating new servant:', userData)
      const response = await api.post('/servants', userData)
      console.log('Servant created successfully:', response.data)
      return response.data
    } catch (error: any) {
      console.error('Error creating servant:', error)
      throw error
    }
  },

  update: async (id: string, userData: any) => {
    try {
      console.log('Updating servant:', id, userData)
      const response = await api.put(`/servants/${id}`, userData)
      console.log('Servant updated successfully:', response.data)
      return response.data
    } catch (error: any) {
      console.error('Error updating servant:', error)
      throw error
    }
  },

  delete: async (id: string) => {
    try {
      console.log('Deleting servant:', id)
      const response = await api.delete(`/servants/${id}`)
      console.log('Servant deleted successfully')
      return response.data
    } catch (error: any) {
      console.error('Error deleting servant:', error)
      throw error
    }
  }
}

// Pastoral Care API calls
export const pastoralCareAPI = {
  getAll: async (filters = {}) => {
    try {
      console.log('Fetching pastoral care records with filters:', filters)
      const params = new URLSearchParams(filters as Record<string, string>)
      const response = await api.get(`/pastoral-care?${params}`)
      console.log('Pastoral care records fetched successfully')
      return response.data
    } catch (error: any) {
      console.error('Error fetching pastoral care records:', error)
      throw error
    }
  },

  create: async (recordData: any) => {
    try {
      console.log('Creating new pastoral care record:', recordData)
      const response = await api.post('/pastoral-care', recordData)
      console.log('Pastoral care record created successfully')
      return response.data
    } catch (error: any) {
      console.error('Error creating pastoral care record:', error)
      throw error
    }
  },

  update: async (id: string, recordData: any) => {
    try {
      console.log('Updating pastoral care record:', id, recordData)
      const response = await api.put(`/pastoral-care/${id}`, recordData)
      console.log('Pastoral care record updated successfully')
      return response.data
    } catch (error: any) {
      console.error('Error updating pastoral care record:', error)
      throw error
    }
  },

  delete: async (id: string) => {
    try {
      console.log('Deleting pastoral care record:', id)
      const response = await api.delete(`/pastoral-care/${id}`)
      console.log('Pastoral care record deleted successfully')
      return response.data
    } catch (error: any) {
      console.error('Error deleting pastoral care record:', error)
      throw error
    }
  }
}

// Export the main api instance and all APIs
export { api }
export default {
  auth: authAPI,
  children: childrenAPI,
  attendance: attendanceAPI,
  classes: classesAPI,
  statistics: statisticsAPI,
  servants: servantsAPI,
  pastoralCare: pastoralCareAPI,
  clearStatisticsCache
}
