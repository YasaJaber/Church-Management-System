import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { statisticsAPI, attendanceAPI, servantsAPI } from "../services/api";
import NotificationManagementScreen from "./NotificationManagementScreen";
import NotificationService from "../services/notificationService";

// دالة لحساب التاريخ القبطي
const getCopticDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // JavaScript months are 0-indexed
  const day = today.getDate();
  
  // تحديد إذا كانت السنة الميلادية كبيسة
  const isGregorianLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  
  // تحديد تاريخ بداية السنة القبطية (11 سبتمبر في السنة العادية، 12 سبتمبر في الكبيسة)
  const copticNewYearDay = isGregorianLeapYear ? 12 : 11;
  
  // حساب السنة القبطية
  let copticYear;
  if (month > 9 || (month === 9 && day >= copticNewYearDay)) {
    copticYear = year - 283; // إذا كنا بعد بداية السنة القبطية
  } else {
    copticYear = year - 284; // إذا كنا قبل بداية السنة القبطية
  }
  
  // الأشهر القبطية مع التواريخ الميلادية المقابلة
  const copticMonths = [
    { name: "توت", startMonth: 9, startDay: copticNewYearDay },
    { name: "بابه", startMonth: 10, startDay: copticNewYearDay },
    { name: "هاتور", startMonth: 11, startDay: copticNewYearDay - 1 },
    { name: "كيهك", startMonth: 12, startDay: copticNewYearDay - 1 },
    { name: "طوبه", startMonth: 1, startDay: copticNewYearDay - 2 },
    { name: "أمشير", startMonth: 2, startDay: copticNewYearDay - 3 },
    { name: "برمهات", startMonth: 3, startDay: copticNewYearDay - 1 },
    { name: "برموده", startMonth: 4, startDay: copticNewYearDay - 2 },
    { name: "بشنس", startMonth: 5, startDay: copticNewYearDay - 2 },
    { name: "بؤونه", startMonth: 6, startDay: copticNewYearDay - 3 },
    { name: "أبيب", startMonth: 7, startDay: copticNewYearDay - 3 },
    { name: "مسرى", startMonth: 8, startDay: copticNewYearDay - 4 },
    { name: "النسئ", startMonth: 9, startDay: copticNewYearDay - 5 }
  ];
  
  // تحديد الشهر والاسم القبطي
  let copticMonth = "";
  let copticDay = 0;
  
  // البحث عن الشهر القبطي المناسب
  for (let i = 0; i < copticMonths.length; i++) {
    const currentMonth = copticMonths[i];
    const nextMonth = copticMonths[i + 1];
    
    if (month === currentMonth.startMonth && day >= currentMonth.startDay) {
      copticMonth = currentMonth.name;
      copticDay = day - currentMonth.startDay + 1;
      break;
    } else if (nextMonth && month === nextMonth.startMonth && day < nextMonth.startDay) {
      copticMonth = currentMonth.name;
      // حساب الأيام من بداية الشهر القبطي
      const daysInGregorianMonth = new Date(year, currentMonth.startMonth, 0).getDate();
      const remainingDaysInStartMonth = daysInGregorianMonth - currentMonth.startDay + 1;
      copticDay = remainingDaysInStartMonth + day;
      break;
    }
  }
  
  // معالجة الحالات الخاصة
  if (!copticMonth) {
    if (month === 9 && day < copticNewYearDay) {
      // أواخر شهر مسرى
      copticMonth = "مسرى";
      copticDay = day + (30 - (copticNewYearDay - 7));
    } else if (month === 9 && day >= (copticNewYearDay - 5) && day < copticNewYearDay) {
      // شهر النسئ
      copticMonth = "النسئ";
      copticDay = day - (copticNewYearDay - 6);
    }
  }
  
  // التأكد من صحة البيانات
  if (!copticMonth || copticDay <= 0) {
    copticMonth = "توت";
    copticDay = 1;
  }
  
  return `${copticDay} ${copticMonth} ${copticYear}`;
};

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [statistics, setStatistics] = useState({
    totalChildren: 0,
    todayPresent: 0,
    attendanceRate: 0,
    consecutiveCount: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
    
    // إعداد معالجات الإشعارات عند تحميل الشاشة
    NotificationService.setupNotificationHandlers();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log("🏠 HomeScreen: Starting to load dashboard data");
      console.log("👤 Current user:", user);

      // Clear any cached statistics to ensure fresh data
      console.log("🧹 Clearing statistics cache for fresh data");

      // Get class ID for filtering (for servants)
      let classId = "";
      if (user?.role === "servant" && user?.assignedClass) {
        classId = user.assignedClass._id;

        // Validate ObjectId format (24 characters hex)
        if (
          typeof classId === "string" &&
          classId.length === 24 &&
          /^[a-fA-F0-9]{24}$/.test(classId)
        ) {
          console.log("✅ Valid class ID:", classId);
        } else {
          console.log("❌ Invalid class ID format:", classId);
          classId = ""; // Reset to empty for admin behavior
        }
      }

      console.log("🆔 Class ID for filtering:", classId || "ALL (Admin)");
      console.log("👤 User role:", user?.role);
      console.log("📋 User assigned class:", user?.assignedClass);

      // Load general statistics
      console.log("📊 Loading general statistics...");
      console.log("🎯 About to call getGeneralStats with classId:", classId);
      const statsResponse = await statisticsAPI.getGeneralStats(classId);
      console.log("📊 Stats response:", statsResponse);

      if (statsResponse.success) {
        console.log("✅ Stats loaded successfully:", statsResponse.data);
        console.log("🔢 Total children from API:", statsResponse.data.totalChildren);
        console.log("📊 Setting statistics state with:", statsResponse.data);
        setStatistics(statsResponse.data);
        console.log("📊 Statistics state should now be:", statsResponse.data);
      } else {
        console.log("❌ Stats failed:", statsResponse.error);
        Alert.alert("خطأ في الإحصائيات", statsResponse.error);
      }

      // Load recent activity (last attendance records regardless of date)
      console.log("📅 Loading recent activity...");

      let activityResponse;
      if (user?.role === "admin") {
        // For admin, show both children and servants activity
        const childrenResponse = await attendanceAPI.getRecentActivity("", 5);
        // Don't pass date to get the most recent Friday's data (more servants attendance records)
        const servantsResponse = await servantsAPI.getRecentActivity();
        
        const combinedData = [];
        
        // Add children data
        if (childrenResponse.success && childrenResponse.data) {
          console.log("👶 Processing children data:", childrenResponse.data);
          childrenResponse.data.forEach(item => {
            console.log("👶 Processing child:", item);
            const activityRecord = {
              _id: item._id,
              name: item.person ? item.person.name : 'غير معروف',
              status: item.status,
              time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
              }) : new Date().toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              type: 'child',
              className: item.person?.class?.stage || 'غير محدد'
            };
            console.log("👶 Adding child activity record:", activityRecord);
            combinedData.push(activityRecord);
          });
        }
        
        // Add servants data
        if (servantsResponse.success && servantsResponse.data && servantsResponse.data.data) {
          console.log("🙏 Processing servants data:", servantsResponse.data.data);
          servantsResponse.data.data.forEach(servant => {
            console.log("🙏 Processing servant:", servant);
            const activityRecord = {
              _id: servant._id,
              name: servant.person ? servant.person.name : 'غير معروف',
              status: servant.status,
              time: servant.createdAt ? new Date(servant.createdAt).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
              }) : new Date().toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              type: 'servant',
              className: 'خدام'
            };
            console.log("🙏 Adding servant activity record:", activityRecord);
            combinedData.push(activityRecord);
          });
        }
        
        console.log("📋 Final combined data before setting:", combinedData);
        activityResponse = { success: true, data: combinedData };
      } else {
        // For servants, show only their class children recent activity
        activityResponse = await attendanceAPI.getRecentActivity(classId, 5);
        
        // Transform the data to match expected format
        if (activityResponse.success && activityResponse.data) {
          console.log("👶 Processing servant class children data:", activityResponse.data);
          activityResponse.data = activityResponse.data.map(item => {
            console.log("👶 Processing servant class child:", item);
            return {
              _id: item._id,
              name: item.person ? item.person.name : 'غير معروف',
              status: item.status,
              time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
              }) : new Date().toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              type: 'child',
              className: item.person?.class?.stage || 'غير محدد'
            };
          });
        }
      }
      
      console.log("📅 Activity response:", activityResponse);

      if (activityResponse.success) {
        console.log("✅ Activity loaded successfully:", activityResponse.data);
        console.log("📊 Combined activity data:", activityResponse.data);
        console.log("📊 Setting recent activity:", activityResponse.data);
        setRecentActivity(activityResponse.data); // All returned records (already limited to 5 in API)
      } else {
        console.log("❌ Activity failed:", activityResponse.error);
      }
    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
      Alert.alert(
        "خطأ",
        "حدث خطأ في تحميل البيانات: " + (error.message || "خطأ غير معروف")
      );
    } finally {
      console.log("🏠 HomeScreen: Finished loading data");
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    console.log("🔄 Manual refresh triggered - clearing statistics cache");
    // Clear the cache to ensure fresh data
    try {
      // Import the cache clearing function
      const { cacheManager } = require('../services/api');
      cacheManager.clearAll();
      console.log("✅ Cache cleared successfully");
    } catch (error) {
      console.log("⚠️ Could not clear cache:", error);
    }
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case "attendance":
        navigation.navigate("Attendance");
        break;
      case "children":
        navigation.navigate("Children");
        break;
      case "statistics":
        navigation.navigate("Statistics");
        break;
      case "notifications":
        setShowNotificationModal(true);
        break;
      case "export":
        if (user?.role === "admin") {
          handleQuickExport();
        }
        break;
      default:
        break;
    }
  };

  const handleQuickExport = () => {
    Alert.alert("تصدير التقارير (PDF)", "اختر نوع التقرير المطلوب تصديره:", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تقرير شامل",
        onPress: () => {
          Alert.alert("معلومات", "تم إزالة ميزة التصدير");
        },
      },
      {
        text: "حضور الخدام",
        onPress: () => {
          Alert.alert("معلومات", "تم إزالة ميزة التصدير");
        },
      },
    ]);
  };

  const renderQuickStats = () => (
    <View style={styles.quickStats}>
      <Text style={styles.sectionTitle}>نظرة سريعة</Text>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderTopColor: "#3498db" }]}>
          <Text style={styles.statNumber}>{statistics.totalChildren}</Text>
          <Text style={styles.statLabel}>إجمالي الأطفال</Text>
        </View>

        <View style={[styles.statCard, { borderTopColor: "#27ae60" }]}>
          <Text style={styles.statNumber}>{statistics.todayPresent}</Text>
          <Text style={styles.statLabel}>الحضور اليوم</Text>
        </View>

        <View style={[styles.statCard, { borderTopColor: "#f39c12" }]}>
          <Text style={styles.statNumber}>{statistics.attendanceRate}%</Text>
          <Text style={styles.statLabel}>نسبة الحضور</Text>
        </View>

        <View style={[styles.statCard, { borderTopColor: "#9b59b6" }]}>
          <Text style={styles.statNumber}>{statistics.consecutiveCount}</Text>
          <Text style={styles.statLabel}>المواظبين</Text>
        </View>
      </View>
    </View>
  );

  const renderRecentActivity = () => {
    console.log("🔄 Rendering recent activity, count:", recentActivity.length);
    console.log("🔄 Recent activity data:", recentActivity);
    
    if (recentActivity.length === 0) {
      return (
        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>النشاط الأخير</Text>
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyText}>لا توجد أنشطة حديثة</Text>
            <Text style={styles.emptySubtext}>
              ابدأ بتسجيل الحضور لمتابعة النشاط
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>آخر تسجيلات الحضور</Text>
        {recentActivity.map((record, index) => (
          <View key={index} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityEmoji}>
                {record.status === "present"
                  ? "✅"
                  : record.status === "absent"
                  ? "❌"
                  : "⏰"}
              </Text>
            </View>
            <View style={styles.activityDetails}>
              <Text style={styles.activityName}>
                {record.name}
              </Text>
              <Text style={styles.activityInfo}>
                {record.type === 'servant' ? 
                  `🙏 خادم` :
                  `📚 ${record.className}`
                }
              </Text>
              <Text style={styles.activityTime}>
                {record.time}
              </Text>
            </View>
            <View style={styles.activityStatus}>
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      record.status === "present"
                        ? "#27ae60"
                        : record.status === "absent"
                        ? "#e74c3c"
                        : "#f39c12",
                  },
                ]}
              >
                {record.status === "present"
                  ? "حاضر"
                  : record.status === "absent"
                  ? "غائب"
                  : "متأخر"}
              </Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => handleQuickAction("attendance")}
        >
          <Text style={styles.viewAllText}>عرض جميع التسجيلات</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>إجراءات سريعة</Text>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: "#27ae60" }]}
        onPress={() => handleQuickAction("attendance")}
      >
        <Text style={styles.actionButtonText}>📝 تسجيل الحضور</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: "#3498db" }]}
        onPress={() => handleQuickAction("children")}
      >
        <Text style={styles.actionButtonText}>👶 إدارة الأطفال</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: "#9b59b6" }]}
        onPress={() => handleQuickAction("statistics")}
      >
        <Text style={styles.actionButtonText}>📊 عرض الإحصائيات</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: "#e67e22" }]}
        onPress={() => handleQuickAction("notifications")}
      >
        <Text style={styles.actionButtonText}>🔔 إشعارات الآيات اليومية</Text>
      </TouchableOpacity>

      {user?.role === "admin" && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#f39c12" }]}
          onPress={() => handleQuickAction("export")}
        >
          <Text style={styles.actionButtonText}>📈 تصدير التقارير</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  console.log("🏠 HomeScreen render - Current statistics state:", statistics);
  console.log("🏠 HomeScreen render - User:", user?.role, user?.assignedClass?.stage);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Image 
          source={require("../../assets/saint-george.png")}
          style={styles.saintImage}
          resizeMode="contain"
        />
        <Text style={styles.welcomeText}>أهلاً وسهلاً، {user?.name}</Text>
        <Text style={styles.roleText}>
          {user?.role === "admin" ? "أمين الخدمة" : "خادم"}
        </Text>
        {user?.assignedClass && (
          <Text style={styles.assignedClassText}>
            الفصل المخصص: {user.assignedClass.stage} -{" "}
            {user.assignedClass.grade}
          </Text>
        )}
        <Text style={styles.churchText}>
          كنيسة الشهيد العظيم مارجرجس
        </Text>
        <Text style={styles.churchLocationText}>
          بأولاد علي
        </Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString("ar-EG", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>
        <Text style={styles.copticDateText}>
          {getCopticDate()}
        </Text>

      </View>

      {renderQuickStats()}
      {renderRecentActivity()}
      {renderQuickActions()}

      <View style={styles.bottomPadding} />

      {/* شاشة إدارة الإشعارات */}
      <NotificationManagementScreen
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#7f8c8d",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 5,
  },
  roleText: {
    fontSize: 16,
    color: "#3498db",
    textAlign: "center",
    marginBottom: 5,
  },
  assignedClassText: {
    fontSize: 14,
    color: "#27ae60",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },
  churchText: {
    fontSize: 15,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 2,
    fontWeight: "600",
  },
  churchLocationText: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 5,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 12,
    color: "#95a5a6",
    textAlign: "center",
  },
  copticDateText: {
    fontSize: 11,
    color: "#e67e22",
    textAlign: "center",
    marginTop: 2,
    fontWeight: "600",
  },
  copticDateText: {
    fontSize: 11,
    color: "#7f8c8d",
    textAlign: "center",
    marginTop: 2,
    fontStyle: "italic",
  },
  quickStats: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 15,
    textAlign: "right",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    borderTopWidth: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center",
  },
  recentActivity: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyActivity: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#bdc3c7",
    textAlign: "center",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  activityEmoji: {
    fontSize: 18,
  },
  activityDetails: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "right",
  },
  activityInfo: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "right",
  },
  activityTime: {
    fontSize: 12,
    color: "#95a5a6",
    textAlign: "right",
  },
  activityStatus: {
    alignItems: "flex-end",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  viewAllButton: {
    marginTop: 15,
    paddingVertical: 10,
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    color: "#3498db",
    fontWeight: "600",
  },
  quickActions: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButton: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 20,
  },
  saintImage: {
    width: 80,
    height: 80,
    marginBottom: 15,
    borderRadius: 40,
  },
});

export default HomeScreen;
