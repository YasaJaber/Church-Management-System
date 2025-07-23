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
  Linking,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAuth } from "../context/AuthContext";
import { servantsAPI } from "../services/api";

const ServantsStatisticsScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [statistics, setStatistics] = useState({
    general: null,
    attendance: null,
    individual: null,
  });

  const periods = [
    { id: "week", label: "آخر 4 جمعات", days: 7 },
    { id: "month", label: "آخر 8 جمعات", days: 30 },
    { id: "quarter", label: "آخر 12 جمعة", days: 90 },
  ];

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod]);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      // Load general servants statistics
      const generalResponse = await servantsAPI.getGeneralStats();

      // Load attendance statistics for the period
      const selectedPeriodData = periods.find((p) => p.id === selectedPeriod);
      const attendanceResponse = await servantsAPI.getAttendanceStats(
        selectedPeriodData.days
      );

      // Load individual servant statistics
      const individualResponse = await servantsAPI.getIndividualStats();

      setStatistics({
        general: generalResponse.success ? generalResponse.data : null,
        attendance: attendanceResponse.success ? attendanceResponse.data : null,
        individual: individualResponse.success ? individualResponse.data : null,
      });
    } catch (error) {
      console.error("Error loading servants statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const handleExportReport = async () => {
    // Export functionality removed
    Alert.alert("معلومات", "تم إزالة ميزة التصدير");
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
            حضور الخدام الأسبوعي -{" "}
            {periods.find((p) => p.id === selectedPeriod)?.label}
          </Text>
          <View style={styles.emptyChartContainer}>
            <Text style={styles.emptyChartText}>👥</Text>
            <Text style={styles.emptyChartTitle}>لا توجد بيانات حضور خدام</Text>
            <Text style={styles.emptyChartSubtitle}>
              لم يتم تسجيل حضور للخدام في هذه الفترة
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
            حضور الخدام الأسبوعي -{" "}
            {periods.find((p) => p.id === selectedPeriod)?.label}
          </Text>
          <View style={styles.emptyChartContainer}>
            <Text style={styles.emptyChartText}>👥</Text>
            <Text style={styles.emptyChartTitle}>بيانات غير صالحة</Text>
            <Text style={styles.emptyChartSubtitle}>
              يرجى المحاولة مرة أخرى أو تحديث البيانات
            </Text>
          </View>
        </View>
      );
    }

    const maxValue = Math.max(...validData.map((d) => d.present), 1);
    const minHeight = 10;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          حضور الخدام الأسبوعي -{" "}
          {periods.find((p) => p.id === selectedPeriod)?.label}
        </Text>

        {/* معلومات إضافية */}
        <View style={styles.chartInfo}>
          <Text style={styles.chartInfoText}>
            إجمالي الأسابيع: {validData.length} | أعلى حضور: {maxValue} خادم
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
                      backgroundColor: day.present > 0 ? "#3498db" : "#e74c3c",
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
              style={[styles.legendColor, { backgroundColor: "#3498db" }]}
            />
            <Text style={styles.legendText}>خدام حاضرين</Text>
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

  const renderIndividualStats = () => {
    if (!statistics.individual || statistics.individual.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>👥</Text>
          <Text style={styles.emptySubText}>لا توجد إحصائيات فردية</Text>
          <Text style={styles.emptyHintText}>
            لم يتم تسجيل أي حضور للخدام بعد
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.individualContainer}>
        <Text style={styles.sectionTitle}>إحصائيات الخدام الفردية</Text>
        {statistics.individual.map((servant, index) => (
          <View key={servant._id} style={styles.servantStatCard}>
            <View style={styles.servantHeader}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.servantInfo}>
                <Text style={styles.servantName}>{servant.name}</Text>
                <Text style={styles.servantClass}>
                  {servant.assignedClass
                    ? `${servant.assignedClass.stage} - ${servant.assignedClass.grade}`
                    : "غير محدد"}
                </Text>
              </View>
              <View style={styles.servantStats}>
                <Text style={styles.attendanceRate}>
                  {servant.attendanceRate}%
                </Text>
                <Text style={styles.attendanceText}>نسبة الحضور</Text>
              </View>
            </View>

            <View style={styles.detailedStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>حاضر</Text>
                <Text style={[styles.statValue, { color: "#27ae60" }]}>
                  {servant.presentCount}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>غائب</Text>
                <Text style={[styles.statValue, { color: "#e74c3c" }]}>
                  {servant.absentCount}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>متأخر</Text>
                <Text style={[styles.statValue, { color: "#f39c12" }]}>
                  {servant.lateCount}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>جاري تحميل إحصائيات الخدام...</Text>
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
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <Text style={styles.periodTitle}>فترة الإحصائيات</Text>
        <View style={styles.periodButtons}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.periodButton,
                selectedPeriod === period.id && styles.selectedPeriodButton,
              ]}
              onPress={() => setSelectedPeriod(period.id)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.id &&
                    styles.selectedPeriodButtonText,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* General Statistics */}
      {statistics.general && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {renderStatCard(
              "إجمالي الخدام",
              statistics.general.totalServants,
              "مسجلين في النظام",
              "#3498db",
              "👥"
            )}
            {renderStatCard(
              "حاضرين اليوم",
              statistics.general.presentToday,
              `من ${statistics.general.totalServants}`,
              "#27ae60",
              "✅"
            )}
          </View>
          <View style={styles.statsRow}>
            {renderStatCard(
              "نسبة الحضور",
              `${statistics.general.attendanceRate}%`,
              "المعدل العام",
              "#e74c3c",
              "📈"
            )}
            {renderStatCard(
              "متوسط الحضور",
              statistics.general.averageAttendance,
              "أسبوعياً",
              "#f39c12",
              "⚖️"
            )}
          </View>
        </View>
      )}

      {/* Attendance Chart */}
      {renderAttendanceChart()}

      {/* Individual Statistics */}
      {renderIndividualStats()}

      {/* Export functionality removed */}

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
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
  },
  periodSelector: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 12,
    textAlign: "center",
  },
  periodButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#ecf0f1",
    alignItems: "center",
  },
  selectedPeriodButton: {
    backgroundColor: "#3498db",
  },
  periodButtonText: {
    fontSize: 12,
    color: "#7f8c8d",
    fontWeight: "600",
  },
  selectedPeriodButtonText: {
    color: "#fff",
  },
  statsContainer: {
    marginHorizontal: 15,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderTopWidth: 4,
    alignItems: "center",
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: "#34495e",
    textAlign: "center",
    fontWeight: "600",
  },
  statSubtitle: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center",
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 16,
  },
  chartInfo: {
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  chartInfoText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 150,
    marginBottom: 16,
  },
  chartBar: {
    alignItems: "center",
    flex: 1,
  },
  chartValue: {
    fontSize: 10,
    color: "#2c3e50",
    marginBottom: 4,
    fontWeight: "bold",
  },
  bar: {
    width: 20,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: "#7f8c8d",
    textAlign: "center",
    transform: [{ rotate: "-45deg" }],
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  emptyChartContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyChartText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyChartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34495e",
    marginBottom: 8,
  },
  emptyChartSubtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
  },
  individualContainer: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 16,
    textAlign: "center",
  },
  servantStatCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  servantHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankNumber: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  servantInfo: {
    flex: 1,
  },
  servantName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 2,
  },
  servantClass: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  servantStats: {
    alignItems: "flex-end",
  },
  attendanceRate: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#27ae60",
  },
  attendanceText: {
    fontSize: 10,
    color: "#7f8c8d",
  },
  detailedStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
    paddingTop: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  emptyContainer: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptySubText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34495e",
    marginBottom: 8,
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

export default ServantsStatisticsScreen;
