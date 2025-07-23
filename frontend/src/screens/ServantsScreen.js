import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../context/AuthContext";
import { servantsAPI, classesAPI } from "../services/api";
import ServantsStatisticsScreen from "./ServantsStatisticsScreen";

const ServantsScreen = () => {
  const { user } = useAuth();
  const [servants, setServants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedServant, setSelectedServant] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    status: "present",
    notes: "",
  });
  const [searchText, setSearchText] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);

  // Servant Management States
  const [classes, setClasses] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingServant, setEditingServant] = useState(null);
  const [servantForm, setServantForm] = useState({
    name: "",
    phone: "",
    role: "servant",
    assignedClassId: "",
  });

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load attendance when date changes
  useEffect(() => {
    loadAttendanceForDate();
  }, [selectedDate]);

  const loadInitialData = async () => {
    await Promise.all([loadServants(), loadClasses()]);
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

  const loadServants = async () => {
    try {
      const response = await servantsAPI.getAllServants();
      if (response.success && response.data) {
        setServants(Array.isArray(response.data) ? response.data : []);
      } else {
        setServants([]);
        Alert.alert("خطأ", "حدث خطأ في تحميل بيانات الخدام");
      }
    } catch (error) {
      console.error("Error loading servants:", error);
      setServants([]);
      Alert.alert("خطأ", "حدث خطأ في الاتصال بالخادم");
    }
  };

  const loadAttendanceForDate = async () => {
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await servantsAPI.getServantAttendanceByDate(dateStr);

      if (response.success && response.data) {
        const attendanceMap = {};
        response.data.forEach((record) => {
          if (record.person && record.person._id) {
            attendanceMap[record.person._id] = {
              status: record.status,
              notes: record.notes || "",
            };
          }
        });
        setAttendanceData(attendanceMap);
      } else {
        setAttendanceData({});
      }
    } catch (error) {
      console.error("Error loading attendance:", error);
      setAttendanceData({});
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const openAttendanceModal = (servant) => {
    setSelectedServant(servant);
    const currentAttendance = attendanceData[servant._id] || {
      status: "present",
      notes: "",
    };
    setAttendanceForm(currentAttendance);
    setModalVisible(true);
  };

  const handleMarkAttendance = async () => {
    if (!selectedServant) return;

    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await servantsAPI.markServantAttendance({
        servantId: selectedServant._id,
        date: dateStr,
        status: attendanceForm.status,
        notes: attendanceForm.notes,
        recordedBy: user?._id, // Add the current user's ID as recordedBy
      });

      if (response.success) {
        // Update local state
        setAttendanceData((prev) => ({
          ...prev,
          [selectedServant._id]: {
            status: attendanceForm.status,
            notes: attendanceForm.notes,
          },
        }));

        setModalVisible(false);
        Alert.alert("نجح", "تم تسجيل الحضور بنجاح");
      } else {
        Alert.alert("خطأ", response.error || "حدث خطأ في تسجيل الحضور");
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      Alert.alert("خطأ", "حدث خطأ في تسجيل الحضور");
    }
  };

  const handleMarkAllPresent = () => {
    Alert.alert("تأكيد", "هل أنت متأكد من تسجيل جميع الخدام كحاضرين؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "نعم",
        style: "default",
        onPress: markAllPresent,
      },
    ]);
  };

  const markAllPresent = async () => {
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      console.log("📝 Marking all servants as present for date:", dateStr);
      console.log("👤 Current user ID:", user?._id);
      const response = await servantsAPI.markAllServantsPresent({
        date: dateStr,
        recordedBy: user?._id, // Use the correct user ID from the destructured auth context
      });

      if (response.success) {
        await loadAttendanceForDate(); // Reload attendance data
        Alert.alert(
          "نجح",
          `تم تسجيل ${response.count || servants.length} خادم كحاضرين`
        );
      } else {
        Alert.alert("خطأ", response.error || "حدث خطأ في تسجيل الحضور");
      }
    } catch (error) {
      console.error("Error marking all present:", error);
      Alert.alert("خطأ", "حدث خطأ في تسجيل الحضور");
    }
  };

  // Servant Management Functions
  const openAddServantModal = () => {
    setEditingServant(null);
    setServantForm({
      name: "",
      phone: "",
      role: "servant",
      assignedClassId: "",
    });
    setEditModalVisible(true);
  };

  const openEditServantModal = (servant) => {
    setEditingServant(servant);
    setServantForm({
      name: servant.name,
      phone: servant.phone || "",
      role: servant.role,
      assignedClassId: servant.assignedClass ? servant.assignedClass._id : "",
    });
    setEditModalVisible(true);
  };

  const handleSaveServant = async () => {
    if (!servantForm.name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم الخادم");
      return;
    }

    try {
      const servantData = {
        name: servantForm.name.trim(),
        phone: servantForm.phone.trim(),
        role: servantForm.role,
        assignedClassId: servantForm.assignedClassId || null,
      };

      // Add password for new servants
      if (!editingServant) {
        servantData.password = "servant123"; // Default password
      }

      let response;
      if (editingServant) {
        response = await servantsAPI.updateServant(
          editingServant._id,
          servantData
        );
      } else {
        response = await servantsAPI.createServant(servantData);
      }

      if (response.success) {
        Alert.alert(
          "نجح",
          editingServant ? "تم تحديث بيانات الخادم" : "تم إضافة الخادم بنجاح"
        );
        setEditModalVisible(false);
        loadServants();
      } else {
        Alert.alert("خطأ", response.error);
      }
    } catch (error) {
      console.error("Error saving servant:", error);
      Alert.alert("خطأ", "حدث خطأ في حفظ البيانات");
    }
  };

  const handleDeleteServant = async (servantId, servantName) => {
    Alert.alert(
      "تأكيد الحذف",
      `هل أنت متأكد من حذف الخادم "${servantName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await servantsAPI.deleteServant(servantId);
              if (response.success) {
                Alert.alert("نجح", "تم حذف الخادم بنجاح");
                loadServants();
              } else {
                Alert.alert("خطأ", response.error);
              }
            } catch (error) {
              console.error("Error deleting servant:", error);
              Alert.alert("خطأ", "حدث خطأ في حذف الخادم");
            }
          },
        },
      ]
    );
  };

  const getServantAttendanceStatus = (servant) => {
    const attendance = attendanceData[servant._id];
    return attendance ? attendance.status : "غائب";
  };

  const getServantAttendanceNotes = (servant) => {
    const attendance = attendanceData[servant._id];
    return attendance ? attendance.notes : "";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "#27ae60";
      case "absent":
        return "#e74c3c";
      case "late":
        return "#f39c12";
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
      case "late":
        return "متأخر";
      default:
        return "غائب";
    }
  };

  const filteredServants = servants.filter((servant) =>
    servant.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderServantItem = ({ item: servant }) => {
    const status = getServantAttendanceStatus(servant);
    const notes = getServantAttendanceNotes(servant);
    const statusColor = getStatusColor(status);
    const statusText = getStatusText(status);

    return (
      <TouchableOpacity
        style={styles.servantCard}
        onPress={() => openAttendanceModal(servant)}
      >
        <View style={styles.servantHeader}>
          <Text style={styles.servantName}>{servant.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.servantDetails}>
          <Text style={styles.servantInfo}>
            📱 {servant.phone || "لا يوجد رقم"}
          </Text>
          {servant.assignedClass && (
            <Text style={styles.servantInfo}>
              📚 {servant.assignedClass.stage} - {servant.assignedClass.grade}
            </Text>
          )}
          {notes && <Text style={styles.notesText}>📝 {notes}</Text>}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.attendanceButton]}
            onPress={() => openAttendanceModal(servant)}
          >
            <Text style={styles.actionButtonText}>حضور</Text>
          </TouchableOpacity>

          {(user?.role === "admin" || user?.role === "servant") && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => openEditServantModal(servant)}
              >
                <Text style={styles.actionButtonText}>تعديل</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteServant(servant._id, servant.name)}
              >
                <Text style={styles.actionButtonText}>حذف</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>جاري تحميل بيانات الخدام...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            📅 {selectedDate.toLocaleDateString("ar-EG")}
          </Text>
          <Text style={styles.dateSubtext}>اضغط لتغيير التاريخ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statisticsButton}
          onPress={() => setShowStatistics(true)}
        >
          <Text style={styles.statisticsButtonText}>📊 إحصائيات الخدام</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Actions */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="البحث عن خادم..."
          value={searchText}
          onChangeText={setSearchText}
          textAlign="right"
        />

        {user?.role === "admin" && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddServantModal}
          >
            <Text style={styles.addButtonText}>➕ إضافة خادم</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAllPresent}
        >
          <Text style={styles.markAllButtonText}>✅ تسجيل حضور الكل</Text>
        </TouchableOpacity>
      </View>

      {/* Servants List */}
      <FlatList
        data={filteredServants}
        keyExtractor={(item) => item._id}
        renderItem={renderServantItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا يوجد خدام</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Statistics Modal */}
      <Modal
        visible={showStatistics}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowStatistics(false)}
      >
        <View style={styles.statisticsModalContainer}>
          <View style={styles.statisticsModalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowStatistics(false)}
            >
              <Text style={styles.closeButtonText}>✕ إغلاق</Text>
            </TouchableOpacity>
            <Text style={styles.statisticsModalTitle}>إحصائيات الخدام</Text>
          </View>
          {showStatistics && <ServantsStatisticsScreen />}
        </View>
      </Modal>

      {/* Attendance Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                تسجيل حضور - {selectedServant?.name}
              </Text>

              {selectedServant?.assignedClass && (
                <Text style={styles.modalSubtitle}>
                  الفصل: {selectedServant.assignedClass.stage} -{" "}
                  {selectedServant.assignedClass.grade}
                </Text>
              )}

              <Text style={styles.modalDate}>
                التاريخ: {selectedDate.toLocaleDateString("ar-EG")}
              </Text>

              {/* Status Selection */}
              <View style={styles.statusSection}>
                <Text style={styles.sectionLabel}>الحالة:</Text>
                <View style={styles.statusOptions}>
                  {[
                    { key: "present", label: "حاضر", color: "#27ae60" },
                    { key: "absent", label: "غائب", color: "#e74c3c" },
                    { key: "late", label: "متأخر", color: "#f39c12" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor:
                            attendanceForm.status === option.key
                              ? option.color
                              : "#f8f9fa",
                        },
                      ]}
                      onPress={() =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          status: option.key,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          {
                            color:
                              attendanceForm.status === option.key
                                ? "#fff"
                                : "#2c3e50",
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.notesSection}>
                <Text style={styles.sectionLabel}>ملاحظات:</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="أضف ملاحظة (اختياري)"
                  value={attendanceForm.notes}
                  onChangeText={(text) =>
                    setAttendanceForm((prev) => ({ ...prev, notes: text }))
                  }
                  multiline
                  textAlign="right"
                />
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>إلغاء</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleMarkAttendance}
                >
                  <Text style={styles.saveButtonText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Servant Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.editModalCancelButton}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>
              {editingServant ? "تعديل بيانات الخادم" : "إضافة خادم جديد"}
            </Text>
            <TouchableOpacity onPress={handleSaveServant}>
              <Text style={styles.editModalSaveButton}>حفظ</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editModalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>اسم الخادم *</Text>
              <TextInput
                style={styles.formInput}
                value={servantForm.name}
                onChangeText={(text) =>
                  setServantForm({ ...servantForm, name: text })
                }
                placeholder="ادخل اسم الخادم"
                textAlign="right"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>رقم التليفون</Text>
              <TextInput
                style={styles.formInput}
                value={servantForm.phone}
                onChangeText={(text) =>
                  setServantForm({ ...servantForm, phone: text })
                }
                placeholder="ادخل رقم التليفون"
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>الدور</Text>
              <View style={styles.roleSelector}>
                {["servant", "serviceLeader"].map((roleOption) => (
                  <TouchableOpacity
                    key={roleOption}
                    style={[
                      styles.roleOption,
                      servantForm.role === roleOption &&
                        styles.roleOptionSelected,
                    ]}
                    onPress={() =>
                      setServantForm({ ...servantForm, role: roleOption })
                    }
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        servantForm.role === roleOption &&
                          styles.roleOptionTextSelected,
                      ]}
                    >
                      {roleOption === "servant" ? "خادم" : "مسؤول خدمة"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>الفصل المسؤول عنه</Text>
              <View style={styles.classSelector}>
                <TouchableOpacity
                  style={[
                    styles.classOption,
                    servantForm.assignedClassId === "" &&
                      styles.classOptionSelected,
                  ]}
                  onPress={() =>
                    setServantForm({ ...servantForm, assignedClassId: "" })
                  }
                >
                  <Text
                    style={[
                      styles.classOptionText,
                      servantForm.assignedClassId === "" &&
                        styles.classOptionTextSelected,
                    ]}
                  >
                    بدون فصل
                  </Text>
                </TouchableOpacity>

                {classes.map((cls) => (
                  <TouchableOpacity
                    key={cls._id}
                    style={[
                      styles.classOption,
                      servantForm.assignedClassId === cls._id &&
                        styles.classOptionSelected,
                    ]}
                    onPress={() =>
                      setServantForm({
                        ...servantForm,
                        assignedClassId: cls._id,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.classOptionText,
                        servantForm.assignedClassId === cls._id &&
                          styles.classOptionTextSelected,
                      ]}
                    >
                      {cls.stage} - {cls.grade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  header: {
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  dateSelector: {
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 2,
  },
  dateSubtext: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: "#f8f9fa",
  },
  markAllButton: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  markAllButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  listContainer: {
    padding: 15,
  },
  servantCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  servantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  servantName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  servantDetails: {
    marginBottom: 15,
  },
  servantInfo: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 5,
    textAlign: "right",
  },
  notesText: {
    fontSize: 14,
    color: "#e67e22",
    fontStyle: "italic",
    textAlign: "right",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: "#3498db",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#7f8c8d",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 5,
  },
  modalDate: {
    fontSize: 16,
    color: "#3498db",
    textAlign: "center",
    marginBottom: 20,
  },
  statusSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 10,
    textAlign: "right",
  },
  statusOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  notesSection: {
    marginBottom: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    padding: 15,
    minHeight: 80,
    backgroundColor: "#f8f9fa",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#7f8c8d",
  },
  saveButton: {
    backgroundColor: "#27ae60",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Statistics Modal Styles
  statisticsButton: {
    backgroundColor: "#9b59b6",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  statisticsButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  statisticsModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  statisticsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
    backgroundColor: "#9b59b6",
  },
  statisticsModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Add Button Styles
  addButton: {
    backgroundColor: "#27ae60",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    marginVertical: 10,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Action Button Styles
  attendanceButton: {
    backgroundColor: "#3498db",
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
  },

  // Edit Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  editModalCancelButton: {
    fontSize: 16,
    color: "#e74c3c",
    fontWeight: "600",
  },
  editModalSaveButton: {
    fontSize: 16,
    color: "#27ae60",
    fontWeight: "600",
  },
  editModalContent: {
    flex: 1,
    padding: 20,
  },

  // Form Styles
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34495e",
    marginBottom: 8,
    textAlign: "right",
  },
  formInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: "right",
  },

  // Role Selector Styles
  roleSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  roleOption: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  roleOptionSelected: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  roleOptionText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
  },
  roleOptionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },

  // Class Selector Styles
  classSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  classOption: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  classOptionSelected: {
    backgroundColor: "#27ae60",
    borderColor: "#27ae60",
  },
  classOptionText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
  },
  classOptionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default ServantsScreen;
