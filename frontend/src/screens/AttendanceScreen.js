import React, { useState, useEffect, useReducer } from "react";
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
import { Calendar, LocaleConfig } from "react-native-calendars";
import { useAuth } from "../context/AuthContext";
import { attendanceAPI, childrenAPI, classesAPI } from "../services/api";

LocaleConfig.locales["ar"] = {
  monthNames: [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ],
  monthNamesShort: [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ],
  dayNames: [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ],
  dayNamesShort: ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمعة", "سبت"],
  today: "اليوم",
};
LocaleConfig.defaultLocale = "ar";

const AttendanceScreen = () => {
  const { user } = useAuth();
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [children, setChildren] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState("");
  const [attendanceData, setAttendanceData] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    status: "present",
    notes: "",
  });
  const [searchText, setSearchText] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load attendance when date or class changes
  useEffect(() => {
    // Always load attendance when date changes, regardless of class selection
    // For admins, this allows them to see all attendance data
    loadAttendanceForDate();
    updateMarkedDates(selectedDate);
  }, [selectedDate, selectedClass]);

  const loadInitialData = async () => {
    await Promise.all([loadChildren(), loadClasses()]);

    // Set default class for servants and class teachers
    if ((user?.role === "servant" || user?.role === "classTeacher") && user?.assignedClass) {
      setSelectedClass(user.assignedClass._id);
    }

    setLoading(false);
  };

  const loadChildren = async () => {
    try {
      const response = await childrenAPI.getAllChildren();
      if (response.success && response.data) {
        setChildren(Array.isArray(response.data) ? response.data : []);
      } else {
        setChildren([]);
      }
    } catch (error) {
      console.error("Error loading children:", error);
      setChildren([]);
    }
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

  const loadAttendanceForDate = async () => {
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      console.log(
        "🔍 Loading attendance for date:",
        dateStr,
        "class:",
        selectedClass || "ALL"
      );

      // Only pass classId if it's actually selected and not empty
      const classIdParam =
        selectedClass && selectedClass.trim() !== "" ? selectedClass : "";

      const response = await attendanceAPI.getAttendanceByDate(
        dateStr,
        classIdParam
      );

      console.log("📡 API Response:", response);

      if (response.success && response.data && Array.isArray(response.data)) {
        // Create attendance data map
        const attendanceMap = {};
        response.data.forEach((record) => {
          if (record.child && record.child._id) {
            // Convert ObjectId to string to ensure consistency
            const childId = record.child._id.toString();
            attendanceMap[childId] = record;
            console.log(
              "📋 Added to map:",
              record.child.name,
              "->",
              record.status,
              "Key:",
              childId
            );
          }
        });

        console.log(
          "🗺️ Final attendance map keys:",
          Object.keys(attendanceMap)
        );
        setAttendanceData(attendanceMap);
      } else {
        console.log("📭 No attendance data found or invalid response");
        setAttendanceData({});
      }
    } catch (error) {
      console.error("❌ Error loading attendance:", error);
      setAttendanceData({});
    }
  };

  const onRefresh = async () => {
    console.log("🔄 Refresh triggered");
    setRefreshing(true);
    try {
      // We need to load children first to make sure the list is up-to-date
      await loadChildren();
      // Then, load the attendance for the selected date
      await loadAttendanceForDate();
    } catch (error) {
      console.error("❌ Error during refresh:", error);
      Alert.alert("خطأ", "حدث خطأ أثناء تحديث البيانات");
    } finally {
      setRefreshing(false);
      console.log("✅ Refresh finished");
    }
  };

  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "اليوم";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "أمس";
    } else {
      return date.toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  const toYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const updateMarkedDates = (currentDate) => {
    const newMarkedDates = {};
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Generate markings for 3 months back and 3 months forward
    for (let i = -3; i <= 3; i++) {
      const monthDate = new Date(year, month + i, 1);
      const currentYear = monthDate.getFullYear();
      const currentMonth = monthDate.getMonth();

      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

      for (
        let d = firstDayOfMonth;
        d <= lastDayOfMonth;
        d.setDate(d.getDate() + 1)
      ) {
        // Use getDay() for local time, where Friday is 5
        if (d.getDay() === 5) {
          const dateString = toYYYYMMDD(d);
          newMarkedDates[dateString] = {
            marked: true,
            dotColor: "red",
          };
        }
      }
    }

    const selectedDateString = toYYYYMMDD(currentDate);
    newMarkedDates[selectedDateString] = {
      ...newMarkedDates[selectedDateString],
      selected: true,
      selectedColor: "#2980b9",
      disableTouchEvent: true,
    };

    setMarkedDates(newMarkedDates);
  };

  const onDateChange = (day) => {
    // day.dateString is 'YYYY-MM-DD' in UTC, which is what we want.
    // new Date(day.dateString) will create a date at UTC midnight.
    const newDate = new Date(day.dateString);

    setSelectedDate(newDate);
    updateMarkedDates(newDate);
    setShowDatePicker(false);
  };

  const onMonthChange = (month) => {
    const newDate = new Date(month.timestamp);
    // Adjust for timezone offset
    const timezoneOffset = newDate.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(newDate.getTime() + timezoneOffset);
    updateMarkedDates(adjustedDate);
  };

  const openAttendanceModal = (child) => {
    setSelectedChild(child);
    const existingRecord = attendanceData[child._id];

    setAttendanceForm({
      status: existingRecord?.status || "present",
      notes: existingRecord?.notes || "",
    });

    setModalVisible(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedChild) {
      console.log("❌ No selected child!");
      return;
    }

    try {
      console.log("🔍 selectedChild object:", selectedChild);
      console.log("🔍 selectedChild._id:", selectedChild._id);

      if (!selectedChild._id) {
        console.log("❌ selectedChild._id is missing!");
        Alert.alert("خطأ", "لم يتم اختيار طفل صحيح");
        return;
      }

      // تأكد أن selectedDate كائن Date قبل استخدام toISOString
      let dateObj =
        selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
      const dateStr = dateObj.toISOString().split("T")[0];
      const attendanceRecord = {
        childId: selectedChild._id, // Changed from 'child' to 'childId'
        date: dateStr,
        status: attendanceForm.status,
        notes: attendanceForm.notes.trim(),
      };

      console.log(
        "🔄 Saving attendance for:",
        selectedChild.name,
        "Status:",
        attendanceForm.status
      );
      console.log("🔄 attendanceRecord object:", attendanceRecord);
      console.log("🔄 selectedChild._id:", selectedChild._id);
      console.log(
        "🔄 Keys in attendanceRecord:",
        Object.keys(attendanceRecord)
      );

      const response = await attendanceAPI.markAttendance(attendanceRecord);

      if (response.success && response.data) {
        console.log(
          "✅ Attendance saved successfully, server responded with:",
          response.data
        );

        // Close the modal first
        setModalVisible(false);

        // Then, update the local state to reflect the change immediately
        setAttendanceData((prevData) => {
          const newData = { ...prevData };
          const childId = selectedChild._id.toString();
          newData[childId] = response.data;
          return newData;
        });

        // Finally, show a success message
        Alert.alert("نجح", "تم حفظ الحضور بنجاح");
        
        // No need to call loadAttendanceForDate() as we've updated the state manually
        // This prevents the brief "flash" of old data.
        
      } else {
        console.error("❌ Save failed:", response.error);
        Alert.alert("خطأ", response.error || "فشل حفظ الحضور");
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      Alert.alert("خطأ", "حدث خطأ في حفظ البيانات");
    }
  };

  const handleDeleteAttendance = async () => {
    if (!selectedChild) return;

    Alert.alert(
      "مسح تسجيل الحضور",
      `هل تريد مسح تسجيل الحضور نهائياً للطفل ${
        selectedChild.name
      } في تاريخ ${formatDate(selectedDate)}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "مسح",
          style: "destructive",
          onPress: async () => {
            try {
              const dateStr = selectedDate.toISOString().split("T")[0];
              const response = await attendanceAPI.deleteAttendance(
                selectedChild._id,
                dateStr
              );

              if (response.success) {
                Alert.alert("نجح", "تم مسح تسجيل الحضور بنجاح");
                setModalVisible(false);
                loadAttendanceForDate();
              } else {
                Alert.alert("خطأ", response.error);
              }
            } catch (error) {
              console.error("Error deleting attendance:", error);
              Alert.alert("خطأ", "حدث خطأ في مسح تسجيل الحضور");
            }
          },
        },
      ]
    );
  };

  const markAllPresent = () => {
    Alert.alert(
      "تسجيل حضور الكل",
      "هل تريد تسجيل حضور جميع الأطفال في هذا الفصل؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تسجيل الحضور",
          onPress: async () => {
            try {
              const dateStr = selectedDate.toISOString().split("T")[0];
              const response = await attendanceAPI.markAllPresent(
                selectedClass,
                dateStr
              );

              if (response.success) {
                Alert.alert("نجح", "تم تسجيل حضور جميع الأطفال");
                loadAttendanceForDate();
              } else {
                Alert.alert("خطأ", response.error);
              }
            } catch (error) {
              console.error("Error marking all present:", error);
              Alert.alert("خطأ", "حدث خطأ في العملية");
            }
          },
        },
      ]
    );
  };

  // Filter children based on selected class and search
  const filteredChildren = children.filter((child) => {
    const matchesSearch = child.name
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchesClass =
      selectedClass === "" ||
      (child.class && child.class._id === selectedClass);

    // Role-based filtering
    if ((user?.role === "servant" || user?.role === "classTeacher") && user?.assignedClass) {
      return (
        matchesSearch &&
        child.class &&
        child.class._id === user.assignedClass._id
      );
    }

    return matchesSearch && matchesClass;
  });

  const getAttendanceStatus = (childId) => {
    // Ensure childId is a string for consistent comparison
    const normalizedChildId = childId ? childId.toString() : null;
    console.log("🎯 Getting attendance status for childId:", normalizedChildId);
    console.log(
      "🗺️ Available keys in attendanceData:",
      Object.keys(attendanceData)
    );

    const record = attendanceData[normalizedChildId];
    console.log("📋 Found record:", record);

    if (!record) return null;

    const status = {
      status: record.status,
      notes: record.notes,
      emoji:
        record.status === "present"
          ? "✅"
          : record.status === "absent"
          ? "❌"
          : "❓",
      color:
        record.status === "present"
          ? "#27ae60"
          : record.status === "absent"
          ? "#e74c3c"
          : "#f39c12",
    };

    console.log("✨ Returning status:", status);
    return status;
  };

  const renderChildItem = ({ item }) => {
    const attendanceStatus = getAttendanceStatus(item._id);

    return (
      <TouchableOpacity
        style={[
          styles.childCard,
          attendanceStatus && {
            borderLeftColor: attendanceStatus.color,
            borderLeftWidth: 4,
          },
        ]}
        onPress={() => openAttendanceModal(item)}
      >
        <View style={styles.childHeader}>
          <View style={styles.childInfo}>
            <Text style={styles.childName}>{item.name}</Text>
            <Text style={styles.childClass}>
              {item.class
                ? `${item.class.stage} - ${item.class.grade}`
                : "غير محدد"}
            </Text>
          </View>

          <View style={styles.attendanceStatus}>
            {attendanceStatus ? (
              <>
                <Text style={styles.attendanceEmoji}>
                  {attendanceStatus.emoji}
                </Text>
                <Text
                  style={[
                    styles.attendanceText,
                    { color: attendanceStatus.color },
                  ]}
                >
                  {attendanceStatus.status === "present"
                    ? "حاضر"
                    : attendanceStatus.status === "absent"
                    ? "غائب"
                    : "متأخر"}
                </Text>
              </>
            ) : (
              <Text style={styles.noAttendanceText}>لم يسجل</Text>
            )}
          </View>
        </View>

        {attendanceStatus?.notes && (
          <Text style={styles.attendanceNotes}>
            ملاحظة: {attendanceStatus.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Date Navigation */}
      <View style={styles.dateSection}>
        <Text style={styles.sectionTitle}>📅 اختر التاريخ:</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.dateButtonContent}>
            <Text style={styles.calendarIcon}>📅</Text>
            <View style={styles.dateInfo}>
              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
              <Text style={styles.dateSubtext}>
                {selectedDate.toLocaleDateString("ar-EG", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Text>
            </View>
            <Text style={styles.dropdownIcon}>📅</Text>
          </View>
          <Text style={styles.clickHint}>اضغط لاختيار تاريخ آخر</Text>
        </TouchableOpacity>
      </View>

      {/* Class Selection (for admin) */}
      {user?.role === "admin" && (
        <View style={styles.classSection}>
          <Text style={styles.sectionTitle}>اختر الفصل:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                  {cls.stage} - {cls.grade}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search */}
      {selectedClass && (
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="البحث عن طفل..."
            value={searchText}
            onChangeText={setSearchText}
            textAlign="right"
          />
        </View>
      )}

      {/* Quick Actions */}
      {selectedClass && filteredChildren.length > 0 && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={markAllPresent}
          >
            <Text style={styles.quickActionText}>✅ تسجيل حضور الكل</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Children List */}
      {selectedClass ? (
        <FlatList
          data={filteredChildren}
          renderItem={renderChildItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد أطفال في هذا الفصل</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>اختر فصل لبدء تسجيل الحضور</Text>
        </View>
      )}

      {/* Attendance Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelButton}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>تسجيل الحضور</Text>
            <TouchableOpacity onPress={handleSaveAttendance}>
              <Text style={styles.modalSaveButton}>حفظ</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedChild && (
              <View style={styles.childDetails}>
                <Text style={styles.childNameModal}>{selectedChild.name}</Text>
                <Text style={styles.childInfoModal}>
                  {selectedChild.class
                    ? `${selectedChild.class.stage} - ${selectedChild.class.grade}`
                    : "غير محدد"}
                </Text>
                <Text style={styles.dateModal}>{formatDate(selectedDate)}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>حالة الحضور:</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    styles.presentButton,
                    attendanceForm.status === "present" &&
                      styles.statusButtonActive,
                  ]}
                  onPress={() =>
                    setAttendanceForm({ ...attendanceForm, status: "present" })
                  }
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      attendanceForm.status === "present" &&
                        styles.statusButtonTextActive,
                    ]}
                  >
                    ✅ حاضر
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    styles.absentButton,
                    attendanceForm.status === "absent" &&
                      styles.statusButtonActive,
                  ]}
                  onPress={() =>
                    setAttendanceForm({ ...attendanceForm, status: "absent" })
                  }
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      attendanceForm.status === "absent" &&
                        styles.statusButtonTextActive,
                    ]}
                  >
                    ❌ غائب
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Delete Attendance Button */}
              <TouchableOpacity
                style={styles.deleteAttendanceButton}
                onPress={handleDeleteAttendance}
              >
                <Text style={styles.deleteAttendanceText}>
                  🗑️ مسح تسجيل الحضور نهائياً
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>ملاحظات:</Text>
              <TextInput
                style={styles.notesInput}
                value={attendanceForm.notes}
                onChangeText={(text) =>
                  setAttendanceForm({ ...attendanceForm, notes: text })
                }
                placeholder="أضف أي ملاحظات..."
                multiline
                numberOfLines={4}
                textAlign="right"
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setShowDatePicker(false)}
          >
            <View style={styles.calendarContainer}>
              <Calendar
                current={toYYYYMMDD(selectedDate)}
                onDayPress={onDateChange}
                markedDates={markedDates}
                onMonthChange={onMonthChange}
                theme={{
                  backgroundColor: "#ffffff",
                  calendarBackground: "#ffffff",
                  textSectionTitleColor: "#b6c1cd",
                  selectedDayBackgroundColor: "#2980b9",
                  selectedDayTextColor: "#ffffff",
                  todayTextColor: "#2980b9",
                  dayTextColor: "#2d4150",
                  textDisabledColor: "#d9e1e8",
                  dotColor: "red",
                  selectedDotColor: "#ffffff",
                  arrowColor: "#2980b9",
                  monthTextColor: "#2980b9",
                  indicatorColor: "blue",
                  textDayFontWeight: "300",
                  textMonthFontWeight: "bold",
                  textDayHeaderFontWeight: "300",
                  textDayFontSize: 16,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 14,
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
  dateSection: {
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  datePickerButton: {
    flexDirection: "column",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#3498db",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  clickHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#3498db",
    fontStyle: "italic",
  },
  calendarIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  dropdownIcon: {
    fontSize: 20,
    color: "#3498db",
    marginLeft: 10,
  },
  dateInfo: {
    alignItems: "center",
    flex: 1,
  },
  dateText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  dateSubtext: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 2,
  },
  classSection: {
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
  searchSection: {
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  quickActions: {
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  quickActionButton: {
    backgroundColor: "#27ae60",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  quickActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    padding: 15,
  },
  childCard: {
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
  childHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "right",
  },
  childAge: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "right",
    marginTop: 2,
  },
  childClass: {
    fontSize: 12,
    color: "#95a5a6",
    textAlign: "right",
    marginTop: 2,
  },
  attendanceStatus: {
    alignItems: "center",
    minWidth: 60,
  },
  attendanceEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  attendanceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noAttendanceText: {
    fontSize: 12,
    color: "#bdc3c7",
  },
  attendanceNotes: {
    fontSize: 12,
    color: "#7f8c8d",
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: "#7f8c8d",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  modalCancelButton: {
    fontSize: 16,
    color: "#e74c3c",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  modalSaveButton: {
    fontSize: 16,
    color: "#27ae60",
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  childDetails: {
    alignItems: "center",
    marginBottom: 30,
    padding: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
  },
  childNameModal: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 5,
  },
  childInfoModal: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 5,
  },
  dateModal: {
    fontSize: 16,
    color: "#3498db",
    fontWeight: "600",
  },
  formGroup: {
    marginBottom: 25,
  },
  formLabel: {
    fontSize: 16,
    color: "#2c3e50",
    marginBottom: 10,
    textAlign: "right",
    fontWeight: "600",
  },
  statusButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statusButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 2,
    alignItems: "center",
  },
  presentButton: {
    backgroundColor: "#d5f4e6",
    borderColor: "#27ae60",
  },
  absentButton: {
    backgroundColor: "#fadbd8",
    borderColor: "#e74c3c",
  },

  statusButtonActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  statusButtonTextActive: {
    color: "#fff",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    height: 100,
  },
  deleteAttendanceButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#ffe6e6",
    borderWidth: 2,
    borderColor: "#ff4757",
    borderRadius: 8,
    alignItems: "center",
  },
  deleteAttendanceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff4757",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    width: "90%",
  },
});

export default AttendanceScreen;
