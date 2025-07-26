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
  Platform,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { pastoralCareAPI } from "../services/api";

const PastoralCareScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [absentChildren, setAbsentChildren] = useState([]);
  const [lastUpdateDate, setLastUpdateDate] = useState("");
  const [totalChildren, setTotalChildren] = useState(0);

  useEffect(() => {
    loadAbsentChildren();
  }, []);

  const loadAbsentChildren = async () => {
    try {
      setLoading(true);
      console.log("🚀 PastoralCareScreen: Starting to load absent children...");
      console.log("👤 Current user:", user);
      
      const response = await pastoralCareAPI.getAbsentChildren();
      
      console.log("🔍 Raw pastoral care response:", response);
      console.log("🔍 Response type:", typeof response);
      console.log("🔍 Response success:", response?.success);
      console.log("🔍 Response data:", response?.data);
      console.log("🔍 Response data length:", response?.data?.length);
      
      if (response && response.success) {
        // Backend returns { success: true, data: [...], date: "...", totalAbsent: ..., message: "..." }
        const children = response.data || [];
        console.log("👶 Children received:", children.length);
        console.log("🔍 First child structure:", children[0]);
        console.log("🔍 All children:", children);
        
        setAbsentChildren(children);
        setLastUpdateDate(response.date || "");
        setTotalChildren(response.totalAbsent || 0);
        console.log(`📋 State updated: ${children.length} absent children`);
        console.log("📅 Date set to:", response.date);
        console.log("🔢 Total set to:", response.totalAbsent);
      } else {
        console.error("❌ Failed to load absent children:", response?.error);
        console.error("❌ Full response:", response);
        Alert.alert("خطأ", response?.error || "حدث خطأ في تحميل قائمة الافتقاد");
      }
    } catch (error) {
      console.error("❌ Error loading absent children:", error);
      console.error("❌ Error stack:", error.stack);
      Alert.alert("خطأ Network", `حدث خطأ غير متوقع: ${error.message}`);
    } finally {
      setLoading(false);
      console.log("🏁 Loading finished");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAbsentChildren();
    setRefreshing(false);
  };

  const handlePhoneCall = (child) => {
    if (!child.phone) {
      Alert.alert(
        "لا يوجد رقم هاتف",
        `لا يوجد رقم هاتف مسجل للطفل ${child.name}`,
        [{ text: "موافق", style: "default" }]
      );
      return;
    }

    const phoneNumber = child.phone.replace(/[^0-9]/g, "");
    const phoneUrl = Platform.OS === "ios" ? `tel:${phoneNumber}` : `tel:${phoneNumber}`;

    Alert.alert(
      "اتصال هاتفي 📞",
      `هل تريد الاتصال بولي أمر الطفل ${child.name}؟\n\nالرقم: ${child.phone}`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "اتصال",
          style: "default",
          onPress: () => {
            Linking.openURL(phoneUrl).catch((err) => {
              console.error("Error opening phone app:", err);
              Alert.alert("خطأ", "لا يمكن فتح تطبيق الهاتف");
            });
          },
        },
      ]
    );
  };

  const handleRemoveChild = (child) => {
    Alert.alert(
      "إزالة من قائمة الافتقاد",
      `هل تريد إزالة ${child.name} من قائمة الافتقاد؟\n\nهذا يعني أنه تم افتقاده أو الاتصال به.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تم الافتقاد ✅",
          style: "default",
          onPress: () => removeChildFromList(child, "تم الافتقاد"),
        },
      ]
    );
  };

  const removeChildFromList = async (child, reason) => {
    try {
      console.log("🔍 Attempting to remove child:", child);
      console.log("🔍 Child ID:", child._id);
      console.log("🔍 Reason:", reason);
      
      if (!child._id) {
        console.error("❌ No child ID found for child:", child);
        Alert.alert("خطأ", "لا يمكن العثور على معرف الطفل");
        return;
      }
      
      const response = await pastoralCareAPI.removeChild(child._id, reason);
      
      if (response.success) {
        setAbsentChildren(prevChildren => 
          prevChildren.filter(c => c._id !== child._id)
        );
        
        Alert.alert(
          "تم بنجاح ✅",
          `تم إزالة ${child.name} من قائمة الافتقاد`,
          [{ text: "موافق", style: "default" }]
        );
      } else {
        Alert.alert("خطأ", response.error || "حدث خطأ في إزالة الطفل من القائمة");
      }
    } catch (error) {
      console.error("❌ Error removing child:", error);
      Alert.alert("خطأ", "حدث خطأ غير متوقع");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>قسم الافتقاد 🤝</Text>
      <Text style={styles.headerSubtitle}>
        الأطفال الذين غابوا في آخر تاريخ حضور
      </Text>
      {lastUpdateDate && (
        <Text style={styles.headerDate}>
          تاريخ آخر حضور: {formatDate(lastUpdateDate)}
        </Text>
      )}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{absentChildren.length}</Text>
          <Text style={styles.statLabel}>محتاج افتقاد</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalChildren}</Text>
          <Text style={styles.statLabel}>أطفال غائبين</Text>
        </View>
      </View>
    </View>
  );

  const renderChildCard = (child, index) => (
    <View key={child.pastoralCareId || child._id} style={styles.childCard}>
      <View style={styles.cardHeader}>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.childClass}>
            {child.className || child.class?.name || `${child.class?.stage} - ${child.class?.grade}` || 'غير محدد'}
          </Text>
          {child.parentName && child.parentName !== child.name && (
            <Text style={styles.parentName}>ولي الأمر: {child.parentName}</Text>
          )}
        </View>
        <View style={styles.childNumber}>
          <Text style={styles.numberText}>{index + 1}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.callButton,
            !child.phone && styles.disabledButton,
          ]}
          onPress={() => handlePhoneCall(child)}
          disabled={!child.phone}
        >
          <Text style={styles.actionIcon}>📞</Text>
          <Text
            style={[
              styles.actionText,
              !child.phone && styles.disabledText,
            ]}
          >
            {child.phone ? "اتصال" : "لا يوجد رقم"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleRemoveChild(child)}
        >
          <Text style={styles.actionIcon}>✅</Text>
          <Text style={styles.actionText}>تم الافتقاد</Text>
        </TouchableOpacity>
      </View>

      {child.phone && (
        <View style={styles.phoneContainer}>
          <Text style={styles.phoneNumber}>📱 {child.phone}</Text>
        </View>
      )}

      {child.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>ملاحظات:</Text>
          <Text style={styles.notesText}>{child.notes}</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎉</Text>
      <Text style={styles.emptyTitle}>رائع!</Text>
      <Text style={styles.emptySubtitle}>
        لا يوجد أطفال محتاجون للافتقاد حالياً
      </Text>
      <Text style={styles.emptyText}>
        جميع الأطفال حضروا في آخر تاريخ حضور أو تم افتقادهم
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshButtonText}>🔄 تحديث القائمة</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>جاري تحميل قائمة الافتقاد...</Text>
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
      {renderHeader()}

      {absentChildren.length === 0 ? (
        renderEmptyState()
      ) : (
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            قائمة الأطفال المحتاجين للافتقاد ({absentChildren.length})
          </Text>
          {absentChildren.map((child, index) => renderChildCard(child, index))}
        </View>
      )}

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
    marginTop: 10,
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 10,
  },
  headerDate: {
    fontSize: 14,
    color: "#3498db",
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  statItem: {
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#e74c3c",
  },
  statLabel: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 15,
  },
  childCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "right",
    marginBottom: 5,
  },
  childClass: {
    fontSize: 14,
    color: "#3498db",
    textAlign: "right",
    marginBottom: 3,
  },
  parentName: {
    fontSize: 13,
    color: "#7f8c8d",
    textAlign: "right",
    fontStyle: "italic",
  },
  childNumber: {
    backgroundColor: "#e74c3c",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  numberText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  callButton: {
    backgroundColor: "#27ae60",
  },
  removeButton: {
    backgroundColor: "#3498db",
  },
  disabledButton: {
    backgroundColor: "#bdc3c7",
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledText: {
    color: "#7f8c8d",
  },
  phoneContainer: {
    backgroundColor: "#ecf0f1",
    padding: 10,
    borderRadius: 6,
    marginBottom: 5,
  },
  phoneNumber: {
    fontSize: 14,
    color: "#2c3e50",
    textAlign: "center",
    fontWeight: "600",
  },
  notesContainer: {
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#ffc107",
  },
  notesLabel: {
    fontSize: 12,
    color: "#856404",
    fontWeight: "bold",
    marginBottom: 3,
  },
  notesText: {
    fontSize: 13,
    color: "#856404",
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    margin: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#27ae60",
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 18,
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 20,
  },
});

export default PastoralCareScreen;
