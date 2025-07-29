import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { statisticsAPI, classesAPI, attendanceAPI } from "../services/api";
import { fetchAttendanceDataForExport } from "../utils/fixedPdfExport";const StatisticsScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [selectedClass, setSelectedClass] = useState("");
  const [classes, setClasses] = useState([]);
  const [statistics, setStatistics] = useState({
    general: null,
    attendance: null,
    consecutive: null,
  });

  const periods = [
    { id: "week", label: "آخر 4 جمعات", days: 7 },
    { id: "month", label: "آخر 8 جمعات", days: 30 },
    { id: "quarter", label: "آخر 12 جمعة", days: 90 },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (classes.length > 0) {
      loadStatistics();
    }
  }, [selectedPeriod, selectedClass]);

  const loadInitialData = async () => {
    await loadClasses();

    // Set default class for servants and class teachers
    if ((user?.role === "servant" || user?.role === "classTeacher") && user?.assignedClass) {
      setSelectedClass(user.assignedClass._id);
    }

    setLoading(false);
  };

  const loadClasses = async () => {
    try {
      const response = await classesAPI.getAllClasses();
      if (response.success && response.data) {
        setClasses(Array.isArray(response.data) ? response.data : []);
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error("Error loading classes:", error);
      setClasses([]);
    }
  };

  const loadStatistics = async () => {
    try {
      const selectedPeriodData = periods.find((p) => p.id === selectedPeriod);

      // Validate selectedClass if it's provided
      let validatedClassId = selectedClass;
      if (
        selectedClass &&
        (typeof selectedClass !== "string" ||
          selectedClass.length !== 24 ||
          !/^[a-fA-F0-9]{24}$/.test(selectedClass))
      ) {
        console.log("❌ Invalid selectedClass format:", selectedClass);
        validatedClassId = ""; // Reset to empty for all classes
      }

      console.log("📊 Loading stats with class ID:", validatedClassId || "ALL");

      // Load general statistics
      const generalResponse = await statisticsAPI.getGeneralStats(
        validatedClassId
      );

      // Load attendance statistics for the period
      const attendanceResponse = await statisticsAPI.getAttendanceStats(
        validatedClassId,
        selectedPeriodData.days
      );

      // Load consecutive attendance
      const consecutiveResponse = await statisticsAPI.getConsecutiveAttendance(
        validatedClassId
      );

      // Generate byClass data by getting general stats for each class (admin only)
      let byClassData = [];
      if (!validatedClassId && classes.length > 0 && user?.role === "admin") {
        // If no specific class selected and user is admin, get stats for all classes
        console.log("📊 Loading individual class statistics (admin view)...");
        for (const classInfo of classes) {
          try {
            const classStatsResponse = await statisticsAPI.getGeneralStats(classInfo._id);
            if (classStatsResponse.success) {
              byClassData.push({
                _id: classInfo._id,
                stage: classInfo.stage,
                grade: classInfo.grade,
                totalChildren: classStatsResponse.data.totalChildren,
                attendanceRate: classStatsResponse.data.attendanceRate,
                averagePresent: Math.round((classStatsResponse.data.totalChildren * classStatsResponse.data.attendanceRate) / 100)
              });
            }
          } catch (error) {
            console.error(`Error loading stats for class ${classInfo.stage}:`, error);
          }
        }
      }

      setStatistics({
        general: generalResponse.success ? generalResponse.data : null,
        attendance: attendanceResponse.success ? { 
          daily: attendanceResponse.data,
          byClass: byClassData 
        } : null,
        consecutive: consecutiveResponse.success
          ? consecutiveResponse.data
          : null,
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
      Alert.alert(
        "خطأ",
        "حدث خطأ في تحميل الإحصائيات: " + (error.message || "خطأ غير معروف")
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const handleExportExcel = async (type) => {
    // Export functionality removed
    Alert.alert("معلومات", "تم إزالة ميزة التصدير");
  };

  const handleExportPDF = async () => {
    // Export functionality removed temporarily for build stability
    Alert.alert("معلومات", "ميزة تصدير PDF مُعطّلة مؤقتاً لضمان استقرار التطبيق.\nسيتم إعادة تفعيلها قريباً.");
  };

  const renderStatCard = (
    title,
    value,
    subtitle,
    color = "#3498db",
    icon = "📊"
  ) => (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderAttendanceChart = () => {
    if (
      !statistics.attendance ||
      !statistics.attendance.daily ||
      statistics.attendance.daily.length === 0
    ) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>
            الحضور اليومي -{" "}
            {periods.find((p) => p.id === selectedPeriod)?.label}
          </Text>
          <View style={styles.emptyChartContainer}>
            <Text style={styles.emptyChartText}>📊</Text>
            <Text style={styles.emptyChartTitle}>لا توجد بيانات حضور</Text>
            <Text style={styles.emptyChartSubtitle}>
              لم يتم تسجيل أي حضور في هذه الفترة
            </Text>
          </View>
        </View>
      );
    }

    // تصفية البيانات للتأكد من وجود قيم صحيحة
    const validData = statistics.attendance.daily.filter(
      (day) => day && typeof day.present === "number" && day.date
    );

    if (validData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>
            الحضور اليومي -{" "}
            {periods.find((p) => p.id === selectedPeriod)?.label}
          </Text>
          <View style={styles.emptyChartContainer}>
            <Text style={styles.emptyChartText}>📊</Text>
            <Text style={styles.emptyChartTitle}>بيانات غير صالحة</Text>
            <Text style={styles.emptyChartSubtitle}>
              يرجى المحاولة مرة أخرى أو تحديث البيانات
            </Text>
          </View>
        </View>
      );
    }

    const maxValue = Math.max(...validData.map((d) => d.present), 1); // تجنب القسمة على صفر
    const minHeight = 10; // الحد الأدنى لارتفاع العمود

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          الحضور اليومي - {periods.find((p) => p.id === selectedPeriod)?.label}
        </Text>

        {/* معلومات إضافية */}
        <View style={styles.chartInfo}>
          <Text style={styles.chartInfoText}>
            إجمالي الأيام: {validData.length} | أعلى حضور: {maxValue}
          </Text>
        </View>

        <View style={styles.chart}>
          {validData.map((day, index) => {
            const barHeight =
              maxValue > 0
                ? Math.max(
                    (day.present / maxValue) * 120,
                    day.present > 0 ? minHeight : 5
                  )
                : minHeight;

            return (
              <View key={index} style={styles.chartBar}>
                <Text style={styles.chartValue}>{day.present}</Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: day.present > 0 ? "#27ae60" : "#e74c3c",
                    },
                  ]}
                />
                <Text style={styles.chartLabel}>
                  {new Date(day.date).toLocaleDateString("ar-EG", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </Text>
              </View>
            );
          })}
        </View>

        {/* شرح الألوان */}
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: "#27ae60" }]}
            />
            <Text style={styles.legendText}>يوجد حضور</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: "#e74c3c" }]}
            />
            <Text style={styles.legendText}>لا يوجد حضور</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderConsecutiveList = () => {
    if (!statistics.consecutive || statistics.consecutive.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🎉 رائع!</Text>
          <Text style={styles.emptySubText}>
            لا يوجد أطفال محتاجون للمتابعة حالياً
          </Text>
          <Text style={styles.emptyHintText}>جميع الأطفال يحضرون بانتظام</Text>
        </View>
      );
    }

    return (
      <View style={styles.consecutiveContainer}>
        <Text style={styles.sectionTitle}>
          المواظبين على الحضور (4 أسابيع متتالية)
        </Text>
        {statistics.consecutive.map((child, index) => {
          // Generate unique key to prevent React key errors
          const uniqueKey = child._id || child.id || `child-${index}-${child.name || index}`;
          
          return (
            <View key={uniqueKey} style={styles.consecutiveItem}>
              <View style={styles.consecutiveRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.consecutiveInfo}>
                <Text style={styles.consecutiveName}>
                  {child.child?.name || child.name}
                </Text>
                <Text style={styles.consecutiveClass}>
                  {child.child?.class
                    ? `${child.child.class.stage} - ${child.child.class.grade}`
                    : "غير محدد"}
                </Text>
              </View>
              <View style={styles.consecutiveStats}>
                <Text style={styles.consecutiveWeeks}>
                  {child.consecutiveWeeks} أسبوع
                </Text>
                <Text style={styles.consecutivePercentage}>
                  {child.attendanceRate}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>جاري تحميل الإحصائيات...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Period Selection */}
      <View style={styles.periodSection}>
        <Text style={styles.sectionTitle}>الفترة الزمنية:</Text>
        <View style={styles.periodButtons}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.periodButton,
                selectedPeriod === period.id && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.id && styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Class Selection (for admin) */}
      {user?.role === "admin" && (
        <View style={styles.classSection}>
          <Text style={styles.sectionTitle}>اختر الفصل:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.classButton,
                selectedClass === "" && styles.classButtonActive,
              ]}
              onPress={() => setSelectedClass("")}
            >
              <Text
                style={[
                  styles.classButtonText,
                  selectedClass === "" && styles.classButtonTextActive,
                ]}
              >
                جميع الفصول
              </Text>
            </TouchableOpacity>

            {classes.map((cls) => (
              <TouchableOpacity
                key={cls._id}
                style={[
                  styles.classButton,
                  selectedClass === cls._id && styles.classButtonActive,
                ]}
                onPress={() => setSelectedClass(cls._id)}
              >
                <Text
                  style={[
                    styles.classButtonText,
                    selectedClass === cls._id && styles.classButtonTextActive,
                  ]}
                >
                  {cls?.stage && cls?.grade
                    ? `${cls.stage} - ${cls.grade}`
                    : "غير محدد"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* General Statistics */}
      {statistics.general && (
        <View style={styles.statsGrid}>
          {renderStatCard(
            "إجمالي الأطفال",
            statistics.general.totalChildren,
            null,
            "#3498db",
            "👶"
          )}
          {renderStatCard(
            "متوسط الحضور",
            `${statistics.general.averageAttendance}%`,
            periods.find((p) => p.id === selectedPeriod)?.label,
            "#27ae60",
            "📈"
          )}
          {renderStatCard(
            "الحضور اليوم",
            statistics.general.todayPresent || 0,
            `من ${statistics.general.totalChildren}`,
            "#f39c12",
            "✅"
          )}
          {renderStatCard(
            "المواظبين",
            statistics.general.consecutiveCount || 0,
            "4 أسابيع متتالية",
            "#9b59b6",
            "🏆"
          )}
        </View>
      )}

      {/* Attendance Chart */}
      {renderAttendanceChart()}

      {/* Class Breakdown (for admin viewing all classes) */}
      {user?.role === "admin" &&
        selectedClass === "" &&
        statistics.attendance?.byClass && (
          <View style={styles.classBreakdown}>
            <Text style={styles.sectionTitle}>إحصائيات الفصول</Text>
            {statistics.attendance.byClass.map((classData, index) => {
              // Generate unique key for class data
              const uniqueKey = classData._id || classData.id || `class-${index}-${classData.stage || index}`;
              
              return (
                <View key={uniqueKey} style={styles.classCard}>
                  <View style={styles.classHeader}>
                    <Text style={styles.className}>
                      {classData?.stage && classData?.grade
                        ? `${classData.stage} - ${classData.grade}`
                        : "غير محدد"}
                    </Text>
                    <Text style={styles.classPercentage}>
                      {classData?.attendanceRate || 0}%
                    </Text>
                  </View>
                  <View style={styles.classStats}>
                    <Text style={styles.classStatText}>
                      إجمالي الأطفال: {classData.totalChildren}
                    </Text>
                    <Text style={styles.classStatText}>
                      متوسط الحضور: {classData.averagePresent}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

      {/* Consecutive Attendance */}
      {renderConsecutiveList()}

      {/* Export Section */}
      <View style={styles.exportSection}>
        <Text style={styles.sectionTitle}>تصدير التقارير</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportPDF}
          disabled={loading}
        >
          <Text style={styles.exportButtonIcon}>📄</Text>
          <Text style={styles.exportButtonText}>
            {loading ? "جاري التصدير..." : "تصدير تقرير الحضور (PDF)"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.exportHint}>
          سيتم تصدير بيانات الحضور للفترة والفصل المحددين حاليًا
        </Text>
      </View>

      <View style={styles.bottomPadding} />
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#7f8c8d",
  },
  periodSection: {
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 10,
    textAlign: "right",
  },
  periodButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  periodButtonText: {
    fontSize: 14,
    color: "#7f8c8d",
    fontWeight: "600",
  },
  periodButtonTextActive: {
    color: "#fff",
  },
  classSection: {
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  classButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  classButtonActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  classButtonText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  classButtonTextActive: {
    color: "#fff",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 15,
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderTopWidth: 4,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 3,
  },
  statSubtitle: {
    fontSize: 12,
    color: "#bdc3c7",
    textAlign: "center",
  },
  chartContainer: {
    backgroundColor: "#fff",
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 15,
    textAlign: "right",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 150,
    paddingVertical: 10,
  },
  chartBar: {
    alignItems: "center",
    flex: 1,
  },
  chartValue: {
    fontSize: 12,
    color: "#2c3e50",
    marginBottom: 5,
    fontWeight: "600",
  },
  bar: {
    width: 20,
    backgroundColor: "#3498db",
    borderRadius: 3,
    minHeight: 5,
  },
  chartLabel: {
    fontSize: 10,
    color: "#7f8c8d",
    marginTop: 5,
    textAlign: "center",
  },
  emptyChartContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 150,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#e1e1e1",
    borderStyle: "dashed",
  },
  emptyChartText: {
    fontSize: 48,
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyChartTitle: {
    fontSize: 16,
    color: "#7f8c8d",
    fontWeight: "bold",
    marginBottom: 4,
  },
  emptyChartSubtitle: {
    fontSize: 14,
    color: "#95a5a6",
    textAlign: "center",
  },
  chartInfo: {
    backgroundColor: "#ecf0f1",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  chartInfoText: {
    fontSize: 12,
    color: "#2c3e50",
    textAlign: "center",
    fontWeight: "600",
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  classBreakdown: {
    margin: 15,
  },
  classCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  classHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  className: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  classPercentage: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#27ae60",
  },
  classStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  classStatText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  consecutiveContainer: {
    margin: 15,
  },
  consecutiveItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  consecutiveRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f39c12",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  consecutiveInfo: {
    flex: 1,
  },
  consecutiveName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "right",
  },
  consecutiveClass: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "right",
  },
  consecutiveStats: {
    alignItems: "flex-end",
  },
  consecutiveWeeks: {
    fontSize: 14,
    fontWeight: "600",
    color: "#27ae60",
  },
  consecutivePercentage: {
    fontSize: 12,
    color: "#7f8c8d",
  },

  // Export Section Styles
  exportSection: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#27ae60",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 10,
    shadowColor: "#27ae60",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  exportButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  exportHint: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 5,
  },

  emptyContainer: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
    margin: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: "#27ae60",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  emptyHintText: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
  },
  bottomPadding: {
    height: 20,
  },
});

export default StatisticsScreen;
