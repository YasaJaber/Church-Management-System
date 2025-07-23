import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { statisticsAPI } from "../services/api";

const ChildStatisticsModal = ({ visible, childId, childName, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    if (visible && childId) {
      loadChildStatistics();
    }
  }, [visible, childId]);

  const loadChildStatistics = async () => {
    try {
      setLoading(true);
      console.log("Fetching statistics for childId:", childId);
      const response = await statisticsAPI.getChildStatistics(childId);

      if (response.success) {
        console.log("Child statistics fetched successfully:", response.data);
        setStatistics(response.data);
      } else {
        console.error("Error fetching child statistics:", response.error);
        Alert.alert("خطأ", response.error || "حدث خطأ في جلب الإحصائيات");
      }
    } catch (error) {
      console.error("Error loading child statistics:", error);
      Alert.alert("خطأ", "حدث خطأ في جلب الإحصائيات");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "#27ae60";
      case "absent":
        return "#e74c3c";
      default:
        return "#7f8c8d";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "present":
        return "حاضر";
      case "absent":
        return "غائب";
      default:
        return "غير محدد";
    }
  };

  const renderStatCard = (
    title,
    value,
    subtitle,
    color = "#3498db",
    icon = "📊"
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderRecentActivity = () => {
    if (!statistics?.recentActivity || statistics.recentActivity.length === 0) {
      return <Text style={styles.noDataText}>لا توجد سجلات حضور حديثة</Text>;
    }

    return statistics.recentActivity.map((record, index) => (
      <View key={index} style={styles.activityItem}>
        <View style={styles.activityDate}>
          <Text style={styles.activityDateText}>{formatDate(record.date)}</Text>
        </View>
        <View
          style={[
            styles.activityStatus,
            { backgroundColor: getStatusColor(record.status) },
          ]}
        >
          <Text style={styles.activityStatusText}>
            {getStatusText(record.status)}
          </Text>
        </View>
        {record.notes && (
          <Text style={styles.activityNotes}>{record.notes}</Text>
        )}
      </View>
    ));
  };

  const renderMonthlyBreakdown = () => {
    if (
      !statistics?.monthlyBreakdown ||
      statistics.monthlyBreakdown.length === 0
    ) {
      return <Text style={styles.noDataText}>لا توجد بيانات شهرية</Text>;
    }

    return statistics.monthlyBreakdown.slice(-6).map((month, index) => (
      <View key={index} style={styles.monthItem}>
        <View style={styles.monthHeader}>
          <Text style={styles.monthName}>{month.monthName}</Text>
          <Text style={styles.monthRate}>{month.rate}%</Text>
        </View>
        <View style={styles.monthStats}>
          <View style={styles.monthStat}>
            <Text style={[styles.monthStatValue, { color: "#27ae60" }]}>
              {month.present}
            </Text>
            <Text style={styles.monthStatLabel}>حاضر</Text>
          </View>

          <View style={styles.monthStat}>
            <Text style={[styles.monthStatValue, { color: "#e74c3c" }]}>
              {month.absent}
            </Text>
            <Text style={styles.monthStatLabel}>غائب</Text>
          </View>
        </View>
      </View>
    ));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>إغلاق</Text>
          </TouchableOpacity>
          <Text style={styles.title}>إحصائيات {childName}</Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>جاري تحميل الإحصائيات...</Text>
          </View>
        ) : statistics ? (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Child Info */}
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{statistics.child.name}</Text>
              <Text style={styles.childDetails}>
                {statistics.child.class?.stage} - {statistics.child.class?.grade}
              </Text>
              <Text style={styles.childDetails}>
                ولي الأمر: {statistics.child.parentName}
              </Text>
            </View>

            {/* Summary Statistics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الإحصائيات العامة</Text>
              <View style={styles.statsGrid}>
                {renderStatCard(
                  "إجمالي الأيام",
                  statistics.summary.totalRecords,
                  "منذ بداية التسجيل",
                  "#3498db",
                  "📅"
                )}
                {renderStatCard(
                  "نسبة الحضور",
                  `${statistics.summary.attendanceRate}%`,
                  "حضور + تأخير",
                  "#27ae60",
                  "📈"
                )}
                {renderStatCard(
                  "أيام الحضور",
                  statistics.summary.presentCount,
                  "حضور فقط",
                  "#2ecc71",
                  "✅"
                )}
                {renderStatCard(
                  "أيام الغياب",
                  statistics.summary.absentCount,
                  "غياب فقط",
                  "#e74c3c",
                  "❌"
                )}

                {renderStatCard(
                  "أطول مواظبة",
                  `${statistics.summary.maxStreak} يوم`,
                  "متتالية",
                  "#9b59b6",
                  "🏆"
                )}
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>النشاط الحديث</Text>
              <View style={styles.activityContainer}>
                {renderRecentActivity()}
              </View>
            </View>

            {/* Monthly Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الإحصائيات الشهرية</Text>
              <View style={styles.monthlyContainer}>
                {renderMonthlyBreakdown()}
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>لا توجد إحصائيات متاحة</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#3498db",
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
  },
  placeholder: {
    width: 60,
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
  content: {
    flex: 1,
  },
  childInfo: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 10,
    alignItems: "center",
  },
  childName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
    textAlign: "center",
  },
  childDetails: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 4,
    textAlign: "center",
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 10,
    padding: 20,
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
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
  },
  statIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 2,
    textAlign: "right",
  },
  statTitle: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "right",
  },
  statSubtitle: {
    fontSize: 12,
    color: "#bdc3c7",
    textAlign: "right",
  },
  activityContainer: {
    gap: 10,
  },
  activityItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 15,
  },
  activityDate: {
    marginBottom: 8,
  },
  activityDateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "right",
  },
  activityStatus: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 8,
  },
  activityStatusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  activityNotes: {
    fontSize: 14,
    color: "#7f8c8d",
    fontStyle: "italic",
    textAlign: "right",
  },
  monthlyContainer: {
    gap: 15,
  },
  monthItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 15,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  monthName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  monthRate: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#27ae60",
  },
  monthStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  monthStat: {
    alignItems: "center",
  },
  monthStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  monthStatLabel: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  noDataText: {
    textAlign: "center",
    color: "#7f8c8d",
    fontSize: 16,
    fontStyle: "italic",
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#7f8c8d",
  },
  bottomPadding: {
    height: 30,
  },
});

export default ChildStatisticsModal;
