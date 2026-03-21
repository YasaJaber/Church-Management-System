import axios from 'axios'
import { tr } from 'date-fns/locale'
import { EnhancedStorage } from '@/utils/storage'
import Cookies from 'js-cookie'
import logger from '@/utils/logger'

// Base URL for the API - الرابط الصحيح للباك إند
const PRODUCTION_API_URL = 'https://church-management-system-b6h7.onrender.com/api'
const LOCAL_URL = 'http://localhost:5000/api'

// Use production environment check
const USE_PRODUCTION_BACKEND = process.env.NEXT_PUBLIC_USE_PRODUCTION === 'true' || 
                               process.env.NODE_ENV === 'production' ||
                               (typeof window !== 'undefined' && window.location.hostname !== 'localhost')

// Determine which API URL to use - استخدم الرابط الصحيح
export const API_BASE_URL = USE_PRODUCTION_BACKEND ? 
  (process.env.NEXT_PUBLIC_API_URL || PRODUCTION_API_URL) : 
  LOCAL_URL

logger.info('API Configuration:', {
  API_BASE_URL,
  USE_PRODUCTION_BACKEND,
  NODE_ENV: process.env.NODE_ENV,
})

// Create axios instance with enhanced CORS settings
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds timeout (increased for heavy operations)
  headers: {
    'Content-Type': 'application/json',
  },
})

// Safe storage operations for web using enhanced storage
const safeStorage = {
  getItem: (key: string): string | null => {
    return EnhancedStorage.getItem(key)
  },
  
  setItem: (key: string, value: string): void => {
    EnhancedStorage.setItem(key, value)
  },
  
  removeItem: (key: string): void => {
    EnhancedStorage.removeItem(key)
  }
}

// Request interceptor with enhanced mobile support
api.interceptors.request.use(
  async (config) => {
    try {
      // Enhanced token retrieval using EnhancedStorage
      const token = EnhancedStorage.getAuthToken()
      
      logger.api('Request', {
        url: config.url,
        hasToken: !!token,
      })
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      logger.error('Error getting token from storage:', error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Enhanced response interceptor for better mobile token management
api.interceptors.response.use(
  (response) => {
    logger.api('Response', {
      status: response.status,
      url: response.config.url,
    })
    
    // Auto-clear cache for attendance marking to ensure fresh data
    if (response.config.url?.includes('/attendance') && response.config.method === 'post') {
      logger.debug('Auto-clearing statistics cache after attendance update')
      clearStatisticsCache()
    }
    
    return response
  },
  async (error) => {
    logger.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
    })
    
    if (error.response?.status === 401) {
      logger.warn('Token expired or invalid, clearing all storage')
      
      // Clear all possible token storage locations using EnhancedStorage
      EnhancedStorage.clearAuth()
      
      // Redirect to login if we're on the client side
      if (typeof window !== 'undefined') {
        // Add small delay to ensure cleanup is complete
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }
    }
    return Promise.reject(error)
  }
)

// Statistics cache management
let statisticsCache: Record<string, any> = {}

const clearStatisticsCache = () => {
  statisticsCache = {}
  logger.debug('Statistics cache cleared')
}

// Auth API calls
export const authAPI = {
  login: async (credentials: { username: string; password: string }) => {
    try {
      logger.debug('🔐 محاولة تسجيل الدخول للمستخدم:', credentials.username)
      logger.debug('🌐 API URL:', `${API_BASE_URL}/auth/login`)
      
      const response = await api.post('/auth/login', credentials)
      logger.debug('✅ تم تسجيل الدخول بنجاح:', response.data)
      return response.data
    } catch (error: any) {
      logger.error('❌ خطأ في تسجيل الدخول:', error)
      logger.error('📝 Response data:', error.response?.data)
      logger.error('📊 Response status:', error.response?.status)
      logger.error('🔍 Request config:', error.config)
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
      logger.error('Get current user error:', error)
      throw error
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh')
      return response.data
    } catch (error: any) {
      logger.error('Refresh token error:', error)
      throw error
    }
  }
}

// Children API calls
export const childrenAPI = {
  getAll: async (filters = {}) => {
    try {
      logger.debug('Fetching all children with filters:', filters)
      const params = new URLSearchParams(filters as Record<string, string>)
      const response = await api.get(`/children?${params}`)
      const children = response.data.data || response.data || []
      logger.debug('Children fetched successfully:', children.length, 'children')
      return { success: true, data: children }
    } catch (error: any) {
      logger.error('Error fetching children:', error)
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
      logger.debug('Fetching children by class:', classId)
      const response = await api.get(`/children/class/${classId}`)
      logger.debug('Children by class response:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error fetching children by class:', error)
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
      logger.error('Error fetching child:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الطفل'
      }
    }
  },

  create: async (childData: any) => {
    try {
      logger.debug('Creating new child:', childData)
      const response = await api.post('/children', childData)
      logger.debug('Child created successfully:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error creating child:', error)
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
      logger.debug('Updating child:', id, childData)
      const response = await api.put(`/children/${id}`, childData)
      logger.debug('Child updated successfully:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error updating child:', error)
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
      logger.debug('Deleting child:', id)
      const response = await api.delete(`/children/${id}`)
      logger.debug('Child deleted successfully')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error deleting child:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في حذف الطفل'
      }
    }
  },

  deleteChild: async (id: string) => {
    return await childrenAPI.delete(id)
  },

  // Get children statistics by class
  getStatisticsByClass: async () => {
    try {
      logger.debug('Fetching children statistics by class')
      const response = await api.get('/children/statistics/by-class')
      logger.debug('Children statistics by class fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching children statistics by class:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل إحصائيات الأطفال'
      }
    }
  },

  // Get individual child statistics
  getIndividualStatistics: async (childId: string) => {
    try {
      logger.debug('Fetching individual child statistics for:', childId)
      const response = await api.get(`/children/statistics/individual/${childId}`)
      logger.debug('Individual child statistics fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching individual child statistics:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل إحصائيات الطفل'
      }
    }
  }
}

// Attendance API calls
export const attendanceAPI = {
  getChildrenWithStatus: async (date: string, classId?: string) => {
    try {
      logger.debug('Fetching children with attendance status for date:', date, 'classId:', classId)
      const params = new URLSearchParams()
      params.append('date', date)
      if (classId) params.append('classId', classId)
      
      const response = await api.get(`/attendance/children-with-status?${params}`)
      logger.debug('Children with status fetched successfully:', response.data.data?.length || 0, 'children')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error fetching children with status:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب بيانات الحضور'
      }
    }
  },

  getByClass: async (classId: string, date?: string) => {
    try {
      logger.debug('Fetching attendance for class:', classId, 'date:', date)
      const params = new URLSearchParams()
      if (date) params.append('date', date)
      
      const response = await api.get(`/attendance/class/${classId}?${params}`)
      logger.debug('Attendance fetched successfully')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error fetching attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الحضور'
      }
    }
  },

  getAttendanceByDate: async (date: string, classId?: string) => {
    try {
      logger.debug('Fetching attendance by date:', date, 'classId:', classId)
      const params = new URLSearchParams()
      params.append('date', date)
      if (classId) params.append('classId', classId)
      
      const response = await api.get(`/attendance/children?${params}`)
      logger.debug('Attendance by date fetched successfully')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error fetching attendance by date:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الحضور'
      }
    }
  },

  markAttendance: async (attendanceData: any) => {
    try {
      logger.debug('Marking attendance:', attendanceData)
      const response = await api.post('/attendance', attendanceData)
      logger.debug('Attendance marked successfully')
      
      // Clear cache after marking attendance
      clearStatisticsCache()
      
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error marking attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تسجيل الحضور'
      }
    }
  },

  markAllPresent: async (classId: string, date: string) => {
    try {
      logger.debug('Marking all present for class:', classId, 'date:', date)
      const response = await api.post('/attendance/mark-all-present', {
        classId,
        date
      })
      logger.debug('All marked present successfully')
      
      // Clear cache after bulk attendance
      clearStatisticsCache()
      
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error marking all present:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تسجيل الحضور الجماعي'
      }
    }
  },

  updateAttendance: async (id: string, attendanceData: any) => {
    try {
      logger.debug('Updating attendance:', id, attendanceData)
      const response = await api.put(`/attendance/${id}`, attendanceData)
      logger.debug('Attendance updated successfully')
      
      // Clear cache after updating attendance
      clearStatisticsCache()
      
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error updating attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحديث الحضور'
      }
    }
  },

  deleteAttendance: async (childId: string, date?: string) => {
    try {
      logger.debug('Deleting attendance for child:', childId, 'date:', date)
      const url = date ? `/attendance/${childId}/${date}` : `/attendance/${childId}`
      const response = await api.delete(url)
      logger.debug('Attendance deleted successfully')
      
      // Clear cache after deleting attendance
      clearStatisticsCache()
      
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error deleting attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في حذف تسجيل الحضور'
      }
    }
  },

  deleteAttendanceByDay: async (date: string, classId?: string) => {
    try {
      logger.debug('Deleting all attendance for date:', date, 'classId:', classId)
      const params = new URLSearchParams()
      params.append('date', date)
      if (classId) params.append('classId', classId)
      
      const response = await api.delete(`/attendance/delete-day?${params}`)
      logger.debug('Day attendance deleted successfully:', response.data)
      
      // Clear cache after deleting attendance
      clearStatisticsCache()
      
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error deleting day attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في حذف سجلات الحضور'
      }
    }
  },

  // Batch attendance for multiple children
  batchSave: async (attendanceData: Array<{
    childId: string
    status: 'present' | 'absent'
    notes?: string
  }>, date: string) => {
    try {
      logger.debug('Saving batch attendance:', attendanceData.length, 'records for date:', date)

      const response = await api.post('/attendance/batch', {
        attendanceData,
        date
      })

      logger.debug('Batch attendance saved successfully:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error saving batch attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تسجيل الحضور الجماعي'
      }
    }
  }
}

// Classes API calls
export const classesAPI = {
  getAll: async () => {
    try {
      logger.debug('Fetching all classes')
      const response = await api.get('/classes')
      const classes = response.data.data || response.data || []
      logger.debug('Classes fetched successfully:', classes.length, 'classes')
      return { success: true, data: classes }
    } catch (error: any) {
      logger.error('Error fetching classes:', error)
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
      logger.error('Error fetching class:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب الفصل'
      }
    }
  },

  create: async (classData: any) => {
    try {
      logger.debug('Creating new class:', classData)
      const response = await api.post('/classes', classData)
      logger.debug('Class created successfully:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error creating class:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في إنشاء الفصل'
      }
    }
  },

  update: async (id: string, classData: any) => {
    try {
      logger.debug('Updating class:', id, classData)
      const response = await api.put(`/classes/${id}`, classData)
      logger.debug('Class updated successfully:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error updating class:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحديث الفصل'
      }
    }
  },

  delete: async (id: string) => {
    try {
      logger.debug('Deleting class:', id)
      const response = await api.delete(`/classes/${id}`)
      logger.debug('Class deleted successfully')
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error deleting class:', error)
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
        logger.debug('Returning cached overview statistics')
        return statisticsCache[cacheKey]
      }

      logger.debug('Fetching overview statistics')
      const response = await api.get('/statistics/overview')
      logger.debug('Overview statistics fetched successfully')
      
      statisticsCache[cacheKey] = response.data
      return response.data
    } catch (error: any) {
      logger.error('Error fetching overview statistics:', error)
      throw error
    }
  },

  getClassStatistics: async (classId: string, period = 'month') => {
    try {
      const cacheKey = `class-${classId}-${period}`
      if (statisticsCache[cacheKey]) {
        logger.debug('Returning cached class statistics')
        return statisticsCache[cacheKey]
      }

      logger.debug('Fetching class statistics for:', classId, 'period:', period)
      const response = await api.get(`/statistics/class/${classId}?period=${period}`)
      logger.debug('Class statistics fetched successfully')
      
      statisticsCache[cacheKey] = response.data
      return response.data
    } catch (error: any) {
      logger.error('Error fetching class statistics:', error)
      throw error
    }
  },

  getAttendanceTrends: async (period = 'month') => {
    try {
      const cacheKey = `trends-${period}`
      if (statisticsCache[cacheKey]) {
        logger.debug('Returning cached attendance trends')
        return statisticsCache[cacheKey]
      }

      logger.debug('Fetching attendance trends for period:', period)
      const response = await api.get(`/statistics/trends?period=${period}`)
      logger.debug('Attendance trends fetched successfully')
      
      statisticsCache[cacheKey] = response.data
      return response.data
    } catch (error: any) {
      logger.error('Error fetching attendance trends:', error)
      throw error
    }
  },

  getChildStatistics: async (childId: string) => {
    try {
      const cacheKey = `child-${childId}`
      if (statisticsCache[cacheKey]) {
        logger.debug('Returning cached child statistics')
        return statisticsCache[cacheKey]
      }

      logger.debug('Fetching individual child statistics for:', childId)
      const response = await api.get(`/children/statistics/individual/${childId}`)
      logger.debug('Child statistics fetched successfully')
      
      statisticsCache[cacheKey] = response.data
      return response.data
    } catch (error: any) {
      logger.error('Error fetching child statistics:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل إحصائيات الطفل'
      }
    }
  }
}

// Servants/Users API calls
export const servantsAPI = {
  getAll: async () => {
    try {
      logger.debug('Fetching all servants')
      const response = await api.get('/servants')
      logger.debug('Servants fetched successfully:', response.data)
      return response.data
    } catch (error: any) {
      logger.error('Error fetching servants:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل الخدام'
      }
    }
  },

  getById: async (id: string) => {
    try {
      const response = await api.get(`/servants/${id}`)
      return response.data
    } catch (error: any) {
      logger.error('Error fetching servant:', error)
      throw error
    }
  },

  create: async (userData: any) => {
    try {
      logger.debug('Creating new servant:', userData)
      const response = await api.post('/servants', userData)
      logger.debug('Servant created successfully:', response.data)
      return response.data
    } catch (error: any) {
      logger.error('Error creating servant:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في إضافة الخادم'
      }
    }
  },

  update: async (id: string, userData: any) => {
    try {
      logger.debug('Updating servant:', id, userData)
      const response = await api.put(`/servants/${id}`, userData)
      logger.debug('Servant updated successfully:', response.data)
      return response.data
    } catch (error: any) {
      logger.error('Error updating servant:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحديث الخادم'
      }
    }
  },

  delete: async (id: string) => {
    try {
      logger.debug('Deleting servant:', id)
      const response = await api.delete(`/servants/${id}`)
      logger.debug('Servant deleted successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error deleting servant:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في حذف الخادم'
      }
    }
  },

  // Get servants statistics by class
  getStatisticsByClass: async () => {
    try {
      logger.debug('Fetching servants statistics by class')
      const response = await api.get('/servants/statistics/by-class')
      logger.debug('Servants statistics by class fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching servants statistics by class:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل إحصائيات الخدام'
      }
    }
  },

  // Get individual servant statistics
  getIndividualStatistics: async (servantId: string) => {
    try {
      logger.debug('Fetching individual servant statistics for:', servantId)
      const response = await api.get(`/servants/statistics/individual/${servantId}`)
      logger.debug('Individual servant statistics fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching individual servant statistics:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل إحصائيات الخادم'
      }
    }
  },

  // Get servants follow-up list (servants needing follow-up)
  getFollowUpList: async () => {
    try {
      logger.debug('Fetching servants follow-up list')
      const response = await api.get('/servants/statistics/follow-up')
      logger.debug('Servants follow-up list fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching servants follow-up list:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل قائمة افتقاد الخدام'
      }
    }
  },

  // Get servants general statistics (including follow-up count)
  getGeneralStatistics: async () => {
    try {
      logger.debug('Fetching servants general statistics')
      const response = await api.get('/servants/statistics/general')
      logger.debug('Servants general statistics fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching servants general statistics:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل الإحصائيات العامة للخدام'
      }
    }
  },

  // Get individual servants statistics with follow-up info
  getIndividualStatisticsList: async () => {
    try {
      logger.debug('Fetching individual servants statistics list')
      const response = await api.get('/servants/statistics/individual')
      logger.debug('Individual servants statistics list fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching individual servants statistics list:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل إحصائيات الخدام الفردية'
      }
    }
  },

  // ==================== ATTENDANCE FUNCTIONS ====================

  // Get servants attendance by date
  getAttendanceByDate: async (date: string) => {
    try {
      logger.debug('Fetching servants attendance for date:', date)
      const response = await api.get(`/servants/attendance?date=${date}`)
      logger.debug('Servants attendance fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching servants attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل بيانات الحضور'
      }
    }
  },

  // Mark servant attendance
  markAttendance: async (attendanceData: {
    servantId: string
    date: string
    status: 'present' | 'absent'
    notes?: string
  }) => {
    try {
      logger.debug('Marking servant attendance:', attendanceData)
      const response = await api.post('/servants/attendance', attendanceData)
      logger.debug('Servant attendance marked successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error marking servant attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تسجيل الحضور'
      }
    }
  },

  // Delete servant attendance
  deleteAttendance: async (servantId: string, date: string) => {
    try {
      logger.debug('Deleting servant attendance for:', servantId, 'on date:', date)
      const response = await api.delete(`/servants-attendance/remove`, {
        data: { servantId, date }
      })
      logger.debug('Servant attendance deleted successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error deleting servant attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في مسح تسجيل الحضور'
      }
    }
  },

  // Mark all servants present for a date
  markAllPresent: async (date: string) => {
    try {
      logger.debug('Marking all servants present for date:', date)
      const response = await api.post('/servants/attendance/mark-all-present', { date })
      logger.debug('All servants marked present successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error marking all servants present:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تسجيل حضور جميع الخدام'
      }
    }
  },

  // Get servant attendance statistics
  getStatistics: async (servantId: string) => {
    try {
      logger.debug('Fetching servant attendance statistics for:', servantId)
      const response = await api.get(`/servants-attendance/statistics/${servantId}`)
      logger.debug('Servant attendance statistics fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching servant attendance statistics:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل إحصائيات الخادم'
      }
    }
  }
}

// Pastoral Care API calls
export const pastoralCareAPI = {
  getAll: async (filters = {}) => {
    try {
      logger.debug('Fetching pastoral care records with filters:', filters)
      const params = new URLSearchParams(filters as Record<string, string>)
      const response = await api.get(`/pastoral-care?${params}`)
      logger.debug('Pastoral care records fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching pastoral care records:', error)
      throw error
    }
  },

  create: async (recordData: any) => {
    try {
      logger.debug('Creating new pastoral care record:', recordData)
      const response = await api.post('/pastoral-care', recordData)
      logger.debug('Pastoral care record created successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error creating pastoral care record:', error)
      throw error
    }
  },

  update: async (id: string, recordData: any) => {
    try {
      logger.debug('Updating pastoral care record:', id, recordData)
      const response = await api.put(`/pastoral-care/${id}`, recordData)
      logger.debug('Pastoral care record updated successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error updating pastoral care record:', error)
      throw error
    }
  },

  delete: async (id: string) => {
    try {
      logger.debug('Deleting pastoral care record:', id)
      const response = await api.delete(`/pastoral-care/${id}`)
      logger.debug('Pastoral care record deleted successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error deleting pastoral care record:', error)
      throw error
    }
  },

  // الافتقاد - الحصول على الأطفال الغائبين
  getAbsentChildren: async () => {
    try {
      logger.debug('Fetching absent children for pastoral care')
      const response = await api.get('/pastoral-care/absent-children')
      logger.debug('Absent children fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching absent children:', error)
      throw error
    }
  },

  // إزالة طفل من قائمة الافتقاد (تم الاتصال به)
  removeChildFromCare: async (childId: string, reason?: string) => {
    try {
      logger.debug('Removing child from pastoral care:', childId)
      const response = await api.delete(`/pastoral-care/remove-child/${childId}`, {
        data: { reason }
      })
      logger.debug('Child removed from pastoral care successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error removing child from pastoral care:', error)
      throw error
    }
  },

  // تسجيل اتصال بطفل
  markChildCalled: async (childId: string, notes?: string) => {
    try {
      logger.debug('Marking child as called:', childId)
      const response = await api.post(`/pastoral-care/mark-called/${childId}`, {
        notes
      })
      logger.debug('Child marked as called successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error marking child as called:', error)
      throw error
    }
  }
}

// Servants Attendance API calls
export const servantsAttendanceAPI = {
  getByDate: async (date: string) => {
    try {
      logger.debug('Fetching servants attendance for date:', date)
      const response = await api.get(`/servants-attendance/date/${date}`)
      logger.debug('Servants attendance fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching servants attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل حضور الخدام'
      }
    }
  },

  create: async (attendanceData: any) => {
    try {
      logger.debug('Creating servant attendance:', attendanceData)
      const response = await api.post('/servants-attendance', attendanceData)
      logger.debug('Servant attendance created successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error creating servant attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تسجيل الحضور'
      }
    }
  },

  update: async (id: string, attendanceData: any) => {
    try {
      logger.debug('Updating servant attendance:', id, attendanceData)
      const response = await api.put(`/servants-attendance/${id}`, attendanceData)
      logger.debug('Servant attendance updated successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error updating servant attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحديث الحضور'
      }
    }
  },

  delete: async (id: string) => {
    try {
      logger.debug('Deleting servant attendance:', id)
      const response = await api.delete(`/servants-attendance/${id}`)
      logger.debug('Servant attendance deleted successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error deleting servant attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في حذف الحضور'
      }
    }
  },

  getStatistics: async (servantId: string) => {
    try {
      logger.debug('Fetching servant attendance statistics for:', servantId)
      const response = await api.get(`/servants-attendance/statistics/${servantId}`)
      logger.debug('Servant attendance statistics fetched successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error fetching servant attendance statistics:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحميل إحصائيات الحضور'
      }
    }
  },

  markAllPresent: async (date: string) => {
    try {
      logger.debug('Marking all servants present for date:', date)
      const response = await api.post('/servants-attendance/mark-all-present', { date })
      logger.debug('All servants marked present successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error marking all servants present:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تسجيل الحضور الجماعي'
      }
    }
  },

  // Batch attendance for multiple servants
  batchSave: async (attendanceData: Array<{
    servantId: string
    status: 'present' | 'absent' | 'excused'
    notes?: string
  }>, date: string) => {
    try {
      logger.debug('Saving servants batch attendance:', attendanceData.length, 'records for date:', date)

      const response = await api.post('/servants-attendance/batch', {
        attendanceData,
        date
      })

      logger.debug('Servants batch attendance saved successfully:', response.data)
      return { success: true, data: response.data.data || response.data }
    } catch (error: any) {
      logger.error('Error saving servants batch attendance:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تسجيل حضور الخدام الجماعي'
      }
    }
  }
}

// Kids API calls (with image upload)
export const kidsAPI = {
  getAll: async () => {
    try {
      logger.debug('Fetching all kids')
      const response = await api.get('/kids')
      logger.debug('Kids fetched successfully:', response.data)
      return response.data
    } catch (error: any) {
      logger.error('Error fetching kids:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب بيانات الأطفال'
      }
    }
  },

  getById: async (id: string) => {
    try {
      const response = await api.get(`/kids/${id}`)
      return response.data
    } catch (error: any) {
      logger.error('Error fetching kid:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في جلب بيانات الطفل'
      }
    }
  },

  addKid: async (formData: FormData) => {
    try {
      logger.debug('Adding new kid with image')
      const response = await api.post('/kids/add-kid', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      logger.debug('Kid added successfully:', response.data)
      return response.data
    } catch (error: any) {
      logger.error('Error adding kid:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في إضافة الطفل'
      }
    }
  },

  update: async (id: string, formData: FormData) => {
    try {
      logger.debug('Updating kid:', id)
      const response = await api.put(`/kids/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      logger.debug('Kid updated successfully:', response.data)
      return response.data
    } catch (error: any) {
      logger.error('Error updating kid:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في تحديث بيانات الطفل'
      }
    }
  },

  delete: async (id: string) => {
    try {
      logger.debug('Deleting kid:', id)
      const response = await api.delete(`/kids/${id}`)
      logger.debug('Kid deleted successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error deleting kid:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في حذف الطفل'
      }
    }
  },

  deleteImage: async (id: string) => {
    try {
      logger.debug('Deleting kid image:', id)
      const response = await api.delete(`/kids/${id}/image`)
      logger.debug('Kid image deleted successfully')
      return response.data
    } catch (error: any) {
      logger.error('Error deleting kid image:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'حدث خطأ في حذف الصورة'
      }
    }
  },
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
  servantsAttendance: servantsAttendanceAPI,
  pastoralCare: pastoralCareAPI,
  kids: kidsAPI,
  clearStatisticsCache
}
