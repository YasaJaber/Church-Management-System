import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Base URL for the API
// Automatically detect the correct base URL based on platform
let BASE_URL;

// Force use production backend for testing
const USE_PRODUCTION_BACKEND = true; // Set to false to use local backend

if (USE_PRODUCTION_BACKEND) {
  BASE_URL = "https://church-management-system-vk3m.onrender.com/api";
} else {
  // FORCE LOCAL SERVER FOR DEBUGGING
  BASE_URL = "http://192.168.1.4:5000/api";
}

console.log("API Base URL:", BASE_URL);
console.log("Platform:", Platform.OS);
console.log("Development mode:", __DEV__);

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds for statistics APIs
  headers: {
    "Content-Type": "application/json",
  },
});

// Enhanced request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      console.log("Token from storage:", token ? "EXISTS" : "NOT_FOUND");
      console.log("Making request to:", config.baseURL + config.url);
      if (token) {
        config.headers.Authorization = "Bearer " + token;
        console.log("Token added to request");
      } else {
        console.log("No token found");
      }
    } catch (error) {
      console.error("Error getting token from storage:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.status, response.config.url);
    
    // Auto-clear cache for attendance marking to ensure fresh data
    if (response.config.url?.includes('/attendance') && response.config.method === 'post') {
      console.log("Auto-clearing statistics cache after attendance update");
      clearStatisticsCache();
    }
    
    return response;
  },
  async (error) => {
    console.log(
      "API Error:",
      error.response?.status,
      error.config?.url,
      error.message
    );
    if (error.response?.status === 401) {
      console.log("Token expired, clearing storage");
      // Token is invalid or expired
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      // Redirect to login or handle accordingly
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: async (username, password) => {
    try {
      console.log("Attempting login for:", username);
      const response = await api.post("/auth/login", { username, password });
      console.log("Login successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      console.error("Response data:", error.response?.data);
      console.error("Response status:", error.response?.status);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في تسجيل الدخول",
      };
    }
  },

  verify: async () => {
    try {
      const response = await api.get("/auth/verify");
      return response.data;
    } catch (error) {
      console.error("Error verifying token:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في التحقق من الرمز",
      };
    }
  },

  createUser: async (userData) => {
    try {
      const response = await api.post("/auth/create-user", userData);
      return response.data;
    } catch (error) {
      console.error("Error creating user:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في إنشاء المستخدم",
      };
    }
  },
};

// Children API calls
export const childrenAPI = {
  getAllChildren: async () => {
    try {
      console.log("Getting all children...");
      const response = await api.get("/children");
      console.log("Children response:", response.data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error("Error getting children:", error);
      console.error("Children error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب الأطفال",
      };
    }
  },

  getByClass: async (classId) => {
    try {
      const response = await api.get(`/children/class/${classId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error("Error getting children by class:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب الأطفال",
      };
    }
  },

  getById: async (childId) => {
    try {
      const response = await api.get(`/children/${childId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error("Error getting child:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب الطفل",
      };
    }
  },

  createChild: async (childData) => {
    try {
      const response = await api.post("/children", childData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error("Error creating child:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في إضافة الطفل",
      };
    }
  },

  updateChild: async (childId, childData) => {
    try {
      const response = await api.put(`/children/${childId}`, childData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error("Error updating child:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في تحديث الطفل",
      };
    }
  },

  deleteChild: async (childId) => {
    try {
      await api.delete(`/children/${childId}`);
      return { success: true };
    } catch (error) {
      console.error("Error deleting child:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في حذف الطفل",
      };
    }
  },
};

// Classes API
export const classesAPI = {
  getAllClasses: async () => {
    try {
      const response = await api.get("/classes");
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error("Error getting classes:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب الفصول",
      };
    }
  },
};

// Attendance API calls
export const attendanceAPI = {
  markAttendance: async (attendanceData) => {
    try {
      console.log("📤 Sending attendance data:", attendanceData);
      console.log("📤 Keys in attendance data:", Object.keys(attendanceData));
      console.log("📤 childId value:", attendanceData.childId);

      // The data is already in the correct format from frontend
      const response = await api.post("/attendance", attendanceData);

      console.log("📥 Received response:", response.data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error("❌ Error marking attendance:", error);
      console.error("❌ Error details:", error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في تسجيل الحضور",
      };
    }
  },

  getAttendanceByDate: async (date, classId = "") => {
    try {
      const params = new URLSearchParams();
      params.append("date", date);
      if (classId) params.append("classId", classId);

      const response = await api.get(
        `/attendance/children?${params.toString()}`
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error("Error getting attendance:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب الحضور",
      };
    }
  },

  getRecentActivity: async (classId = "", limit = 10) => {
    try {
      const params = new URLSearchParams();
      if (classId) params.append("classId", classId);
      params.append("limit", limit);

      const response = await api.get(
        `/attendance/recent-activity?${params.toString()}`
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error("Error getting recent activity:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب النشاط الأخير",
      };
    }
  },

  markAllPresent: async (classId, date) => {
    try {
      const response = await api.post("/attendance/mark-all-present", {
        classId,
        date,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error marking all present:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في تسجيل حضور الكل",
      };
    }
  },

  getChildrenAttendance: async (date, classId) => {
    try {
      const params = new URLSearchParams();
      if (date) params.append("date", date);
      if (classId) params.append("classId", classId);

      const response = await api.get(
        `/attendance/children?${params.toString()}`
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error("Error getting children attendance:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب الحضور",
      };
    }
  },

  getServantsAttendance: async (date) => {
    try {
      const params = new URLSearchParams();
      if (date) params.append("date", date);

      const response = await api.get(
        `/attendance/servants?${params.toString()}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error getting servants attendance:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب حضور الخدام",
      };
    }
  },

  recordChildAttendance: async (attendanceData) => {
    const response = await api.post("/attendance/children", attendanceData);
    return response.data;
  },

  recordServantAttendance: async (attendanceData) => {
    const response = await api.post("/attendance/servants", attendanceData);
    return response.data;
  },

  getChildAttendanceHistory: async (childId) => {
    const response = await api.get(`/attendance/child/${childId}`);
    return response.data;
  },



  deleteAttendance: async (childId, date) => {
    try {
      const response = await api.delete(`/attendance/${childId}/${date}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error deleting attendance:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في مسح تسجيل الحضور",
      };
    }
  },


};

// Simple cache for statistics data
const statisticsCache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Helper function to get cached data
const getCachedData = (key) => {
  const cached = statisticsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("📦 Using cached data for:", key);
    return cached.data;
  }
  return null;
};

// Helper function to cache data
const setCachedData = (key, data) => {
  statisticsCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Helper function to clear cache
const clearStatisticsCache = () => {
  statisticsCache.clear();
  console.log("🧹 Statistics cache cleared");
};

// Helper function to clear specific cache entry
const clearCachedData = (key) => {
  statisticsCache.delete(key);
  console.log("🧹 Cleared cache for:", key);
};

// Statistics API calls
export const statisticsAPI = {
  getChildStatistics: async (childId) => {
    try {
      console.log("📊 Getting child statistics for ID:", childId);
      
      // Validate childId
      if (!childId) {
        console.error("❌ Child ID is required");
        return {
          success: false,
          error: "Child ID is required",
        };
      }

      // Check cache first
      const cacheKey = `child_stats_${childId}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData };
      }

      // Make API call
      const response = await api.get(`/statistics/child/${childId}`);
      console.log("✅ Child statistics response:", response.data);
      
      // Check if response has the expected structure
      if (response.data && response.data.success && response.data.data) {
        setCachedData(cacheKey, response.data.data);
        return { success: true, data: response.data.data };
      } else {
        console.error("❌ Unexpected response structure:", response.data);
        return {
          success: false,
          error: "Unexpected response format from server",
        };
      }
    } catch (error) {
      console.error("❌ Error getting child statistics:", error);
      console.error("❌ Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.details || "حدث خطأ في جلب إحصائيات الطفل",
      };
    }
  },

  getClassStatistics: async (classId, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await api.get(
      `/statistics/class/${classId}?${params.toString()}`
    );
    return response.data;
  },

  getChurchStatistics: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await api.get(`/statistics/church?${params.toString()}`);
    return response.data;
  },

  exportClassAttendance: async (classId, startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await api.get(
      `/statistics/export/class/${classId}?${params.toString()}`
    );
    return { success: true, data: response.data };
  },

  exportAllAttendance: async (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await api.get(
      `/statistics/export/all?${params.toString()}`
    );
    return { success: true, data: response.data };
  },

  exportServantsAttendance: async (startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await api.get(
        `/statistics/export/servants?${params.toString()}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error exporting servants attendance:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في تصدير التقرير",
      };
    }
  },

  // Additional functions needed for the screens
  getGeneralStats: async (classId = "") => {
    try {
      // Create proper cache key that includes classId
      const cacheKey = `general_stats_${classId || 'all'}`;
      console.log("🔑 Cache key:", cacheKey);
      
      // Check cache first but with proper key differentiation
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log("� Using cached data for:", cacheKey, "->", cachedData);
        return { success: true, data: cachedData };
      }

      let endpoint;
      if (classId) {
        endpoint = `/statistics/class/${classId}`;
      } else {
        endpoint = "/statistics/church";
      }

      console.log("📊 Getting general stats from:", endpoint);
      console.log("🆔 Class ID:", classId || "ALL");

      const response = await api.get(endpoint);
      console.log("📈 Stats response:", response.data);
      const data = response.data.data;

      // Map the response to expected format
      const statsData = {
        totalChildren: data.totalChildren,
        todayPresent: data.presentToday || 0,
        attendanceRate: data.attendanceRate,
        averageAttendance: data.averageAttendance || 0,
        consecutiveCount: 0, // Will be calculated separately
      };

      console.log("📊 Final stats data for", cacheKey, ":", statsData);

      // Cache the result with proper key
      // setCachedData(cacheKey, statsData);

      return {
        success: true,
        data: statsData,
      };
    } catch (error) {
      console.error("❌ Error getting general stats:", error);
      console.error("📊 Stats error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        config: error.config?.url,
      });
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب الإحصائيات",
      };
    }
  },

  getAttendanceStats: async (classId = "", days = 30) => {
    try {
      // Temporarily disable cache for debugging
      console.log("🚫 Cache disabled for attendance stats debugging");
      // const cacheKey = `attendance_stats_${classId || 'all'}_${days}`;
      // const cachedData = getCachedData(cacheKey);
      // if (cachedData) {
      //   return { success: true, data: cachedData };
      // }

      const params = new URLSearchParams();
      if (classId) params.append("classId", classId);
      params.append("days", days.toString());

      console.log("📊 Getting attendance stats...");
      const response = await api.get(
        `/statistics/attendance?${params.toString()}`
      );
      
      const responseData = response.data.data;
      // setCachedData(cacheKey, responseData);
      
      return { success: true, data: responseData };
    } catch (error) {
      console.error("Error getting attendance stats:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب إحصائيات الحضور",
      };
    }
  },

  getConsecutiveAttendance: async (classId = "") => {
    try {
      // Check cache first
      const cacheKey = `consecutive_${classId || 'all'}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData };
      }

      const params = new URLSearchParams();
      if (classId) params.append("classId", classId);

      console.log("📊 Getting consecutive attendance with cache...");
      const response = await api.get(
        `/statistics/consecutive-attendance?${params.toString()}`
      );
      
      const responseData = response.data.data;
      setCachedData(cacheKey, responseData);
      
      return { success: true, data: responseData };
    } catch (error) {
      console.error("Error getting consecutive attendance:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب المواظبين",
      };
    }
  },

  // Fast combined statistics endpoint for better performance
  getCombinedStats: async (classId = "", days = 7) => {
    try {
      // Check cache first
      const cacheKey = `combined_stats_${classId || 'all'}_${days}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData };
      }

      const params = new URLSearchParams();
      if (classId) params.append("classId", classId);
      params.append("days", days.toString());

      console.log("⚡ Getting combined stats for faster loading...");
      const response = await api.get(
        `/statistics/combined?${params.toString()}`
      );
      
      const responseData = response.data.data;
      setCachedData(cacheKey, responseData);
      
      return { success: true, data: responseData };
    } catch (error) {
      console.error("Error getting combined statistics:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب الإحصائيات",
      };
    }
  },

  exportClassAttendance: async (classId) => {
    try {
      // استخدام endpoint الصحيح مع فترة زمنية افتراضية
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30); // آخر 30 يوم
      
      const params = new URLSearchParams({
        classId: classId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      
      const response = await api.get(`/statistics/export-class-attendance?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error exporting class attendance:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في تصدير التقرير",
      };
    }
  },

  exportAllClassesAttendance: async () => {
    try {
      // استخدام endpoint الصحيح مع فترة زمنية افتراضية
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30); // آخر 30 يوم
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        classId: 'all'
      });
      
      const response = await api.get(`/statistics/export-attendance?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error exporting all classes attendance:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في تصدير التقرير",
      };
    }
  },

  // Cache management functions
  clearCache: () => {
    clearStatisticsCache();
  },

  clearSpecificCache: (classId = "") => {
    const keys = [
      `general_stats_${classId || 'all'}`,
      `attendance_stats_${classId || 'all'}_30`,
      `attendance_stats_${classId || 'all'}_7`,
      `consecutive_${classId || 'all'}`
    ];
    keys.forEach(key => clearCachedData(key));
  },

  // Force refresh function that bypasses cache
  forceRefreshStats: async (classId = "") => {
    // Clear relevant cache entries first
    const keys = [
      `general_stats_${classId || 'all'}`,
      `attendance_stats_${classId || 'all'}_30`,
      `attendance_stats_${classId || 'all'}_7`,
      `consecutive_${classId || 'all'}`
    ];
    keys.forEach(key => clearCachedData(key));

    // Then fetch fresh data
    return await statisticsAPI.getGeneralStats(classId);
  },

  // PDF Export functions removed

  // Alternative PDF export functions removed
};

// Servants API
export const servantsAPI = {
  // Get all servants
  getAllServants: async () => {
    try {
      const response = await api.get("/servants");
      return response.data;
    } catch (error) {
      console.error("Error getting servants:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تحميل بيانات الخدام",
      };
    }
  },

  // Get servant attendance by date
  getServantAttendanceByDate: async (date) => {
    try {
      const response = await api.get(`/servants/attendance?date=${date}`);
      return response.data;
    } catch (error) {
      console.error("Error getting servant attendance:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تحميل بيانات الحضور",
      };
    }
  },

  // Mark servant attendance
  markServantAttendance: async (attendanceData) => {
    try {
      const response = await api.post("/servants/attendance", attendanceData);
      return response.data;
    } catch (error) {
      console.error("Error marking servant attendance:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تسجيل الحضور",
      };
    }
  },

  // Mark all servants as present
  markAllServantsPresent: async (data) => {
    try {
      console.log("📨 Sending mark all servants present request with data:", data);
      const response = await api.post("/servants/attendance/mark-all-present", data);
      console.log("✅ Mark all servants present response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error marking all servants present:", error);
      console.error("❌ Error response:", error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تسجيل الحضور",
      };
    }
  },

  // Get general servants statistics
  getGeneralStats: async () => {
    try {
      const response = await api.get("/servants/statistics/general");
      return response.data;
    } catch (error) {
      console.error("Error getting general servants stats:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تحميل الإحصائيات العامة",
      };
    }
  },

  // Get attendance statistics for a period
  getAttendanceStats: async (days) => {
    try {
      const response = await api.get(
        `/servants/statistics/attendance?days=${days}`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting servants attendance stats:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تحميل إحصائيات الحضور",
      };
    }
  },

  // Get individual servants statistics
  getIndividualStats: async () => {
    try {
      const response = await api.get("/servants/statistics/individual");
      return response.data;
    } catch (error) {
      console.error("Error getting individual servants stats:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تحميل الإحصائيات الفردية",
      };
    }
  },

  // Export servants statistics report
  exportServantsReport: async () => {
    try {
      const response = await api.get("/servants/statistics/export");
      return response.data;
    } catch (error) {
      console.error("Error exporting servants report:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تصدير التقرير",
      };
    }
  },

  // Get single servant details
  getServantById: async (servantId) => {
    try {
      const response = await api.get(`/servants/${servantId}`);
      return response.data;
    } catch (error) {
      console.error("Error getting servant:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تحميل بيانات الخادم",
      };
    }
  },

  // Create new servant
  createServant: async (servantData) => {
    try {
      const response = await api.post("/servants", servantData);
      return response.data;
    } catch (error) {
      console.error("Error creating servant:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في إضافة الخادم",
      };
    }
  },

  // Update servant information
  updateServant: async (servantId, servantData) => {
    try {
      const response = await api.put(`/servants/${servantId}`, servantData);
      return response.data;
    } catch (error) {
      console.error("Error updating servant:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تحديث بيانات الخادم",
      };
    }
  },

  // Delete servant
  deleteServant: async (servantId) => {
    try {
      const response = await api.delete(`/servants/${servantId}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting servant:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في حذف الخادم",
      };
    }
  },

  // Get recent servants activity (defaults to most recent Friday)
  getRecentActivity: async (date = null) => {
    try {
      const url = date ? `/servants/attendance?date=${date}` : '/servants/attendance';
      console.log('🙏 Fetching servants activity from:', url);
      const response = await api.get(url);
      console.log('🙏 Servants activity response:', response.data);
      return response.data;
    } catch (error) {
      console.error("Error getting servants recent activity:", error);
      return {
        success: false,
        error: error.response?.data?.error || "خطأ في تحميل النشاط الأخير",
      };
    }
  },


};

// Export cache management functions
export const cacheManager = {
  clearAll: clearStatisticsCache,
  clearSpecific: clearCachedData,
  clearStats: (classId = "") => {
    const keys = [
      `general_stats_${classId || 'all'}`,
      `attendance_stats_${classId || 'all'}_30`,
      `attendance_stats_${classId || 'all'}_7`,
      `consecutive_${classId || 'all'}`
    ];
    keys.forEach(key => clearCachedData(key));
  }
};

// Pastoral Care API calls
export const pastoralCareAPI = {
  getAbsentChildren: async () => {
    try {
      console.log("📋 API: Getting absent children for pastoral care...");
      console.log("📋 API: Making request to /pastoral-care/absent-children");
      
      const response = await api.get("/pastoral-care/absent-children");
      
      console.log("📋 API: Response status:", response.status);
      console.log("📋 API: Response headers:", response.headers);
      console.log("📋 API: Full response data:", response.data);
      console.log("📋 API: Response data type:", typeof response.data);
      console.log("📋 API: Response.data.success:", response.data?.success);
      console.log("📋 API: Response.data.data length:", response.data?.data?.length);
      
      // The backend returns { success: true, data: [...], date: "...", totalAbsent: ..., message: "..." }
      // Return it directly without wrapping
      console.log("📋 API: Returning response.data directly");
      return response.data;
    } catch (error) {
      console.error("❌ API: Error getting absent children:", error);
      console.error("❌ API: Error response:", error.response?.data);
      console.error("❌ API: Error status:", error.response?.status);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب قائمة الافتقاد",
      };
    }
  },

  removeChild: async (childId, reason = "") => {
    try {
      console.log(`🗑️ Removing child ${childId} from pastoral care with reason: ${reason}`);
      const response = await api.delete(`/pastoral-care/remove-child/${childId}`, {
        data: { reason }
      });
      console.log("✅ Child removed from pastoral care:", response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("❌ Error removing child from pastoral care:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في إزالة الطفل من قائمة الافتقاد",
      };
    }
  },
};

export default api;
