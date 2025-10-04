import { API_BASE_URL } from './api'
import { EnhancedStorage } from '@/utils/storage'

export interface ExportAttendanceParams {
  classId?: string
  fromDate: string
  toDate: string
}

export const attendanceExportService = {
  // للمدرس - يجلب غياب فصله
  getTeacherAttendance: async (params: Omit<ExportAttendanceParams, 'classId'>) => {
    const token = EnhancedStorage.getAuthToken()
    const response = await fetch(
      `${API_BASE_URL}/attendance/export/teacher?fromDate=${params.fromDate}&toDate=${params.toDate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    )

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'فشل في جلب بيانات الغياب')
    }
    return data
  },

  // لأمين الخدمة - يجلب غياب أي فصل
  getServiceMinisterAttendance: async (params: ExportAttendanceParams) => {
    const token = EnhancedStorage.getAuthToken()
    const response = await fetch(
      `${API_BASE_URL}/attendance/export/admin?classId=${params.classId}&fromDate=${params.fromDate}&toDate=${params.toDate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    )

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'فشل في جلب بيانات الغياب')
    }
    return data
  },

  // جلب قائمة الفصول (لأمين الخدمة)
  getAllClasses: async () => {
    const token = EnhancedStorage.getAuthToken()
    const response = await fetch(`${API_BASE_URL}/classes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'فشل في جلب الفصول')
    }
    return data
  }
}
