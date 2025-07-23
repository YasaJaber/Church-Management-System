import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { childrenAPI, classesAPI } from "../services/api";
import ChildStatisticsModal from "../components/ChildStatisticsModal";

const ChildrenScreen = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [childForm, setChildForm] = useState({
    name: "",
    phone: "",
    notes: "",
  });

  // Statistics Modal State
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [selectedChildForStats, setSelectedChildForStats] = useState(null);

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([loadChildren(), loadClasses()]);
    setLoading(false);
  };

  const loadChildren = async () => {
    try {
      const response = await childrenAPI.getAllChildren();
      if (response.success && response.data) {
        setChildren(Array.isArray(response.data) ? response.data : []);
      } else {
        setChildren([]);
        Alert.alert("خطأ", "حدث خطأ في تحميل بيانات الأطفال");
      }
    } catch (error) {
      console.error("Error loading children:", error);
      setChildren([]);
      Alert.alert("خطأ", "حدث خطأ في الاتصال بالخادم");
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChildren();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditingChild(null);
    setChildForm({
      name: "",
      phone: "",
      notes: "",
    });
    setModalVisible(true);
  };

  const openEditModal = (child) => {
    setEditingChild(child);
    setChildForm({
      name: child.name,
      phone: child.phone || "",
      notes: child.notes || "",
    });
    setModalVisible(true);
  };

  const handleSaveChild = async () => {
    if (!childForm.name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم الطفل");
      return;
    }

    try {
      const childData = {
        name: childForm.name.trim(),
        phone: childForm.phone.trim() || "", // اختياري
        notes: childForm.notes.trim() || "", // اختياري
      };

      let response;
      if (editingChild) {
        response = await childrenAPI.updateChild(editingChild._id, childData);
      } else {
        response = await childrenAPI.createChild(childData);
      }

      if (response.success) {
        Alert.alert(
          "نجح",
          editingChild ? "تم تحديث بيانات الطفل" : "تم إضافة الطفل بنجاح"
        );
        setModalVisible(false);
        loadChildren();
      } else {
        Alert.alert("خطأ", response.error);
      }
    } catch (error) {
      console.error("Error saving child:", error);
      Alert.alert("خطأ", "حدث خطأ في حفظ البيانات");
    }
  };

  const handleDeleteChild = async (childId) => {
    Alert.alert(
      "تأكيد الحذف",
      "هل أنت متأكد من حذف هذا الطفل؟ لا يمكن التراجع عن هذا الإجراء.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await childrenAPI.deleteChild(childId);
              if (response.success) {
                Alert.alert("نجح", "تم حذف الطفل بنجاح");
                loadChildren();
              } else {
                Alert.alert("خطأ", response.error);
              }
            } catch (error) {
              console.error("Error deleting child:", error);
              Alert.alert("خطأ", "حدث خطأ في حذف الطفل");
            }
          },
        },
      ]
    );
  };

  const openStatsModal = (child) => {
    console.log("Opening stats modal for child:", child);
    if (child && child._id) {
      setSelectedChildForStats(child);
      setStatsModalVisible(true);
    } else {
      Alert.alert("خطأ", "لا يمكن عرض الإحصائيات لهذا الطفل.");
    }
  };

  const closeStatsModal = () => {
    setStatsModalVisible(false);
    setSelectedChildForStats(null);
  };

  // Filter children based on search and class
  const filteredChildren = children.filter((child) => {
    const matchesSearch = child.name
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchesClass =
      selectedClass === "" ||
      (child.class && child.class._id === selectedClass);

    // Role-based filtering
    if (user?.role === "servant" && user?.assignedClass) {
      return (
        matchesSearch &&
        matchesClass &&
        child.class &&
        child.class._id === user.assignedClass._id
      );
    }

    return matchesSearch && matchesClass;
  });

  const renderChildItem = ({ item }) => (
    <View style={styles.childCard}>
      <View style={styles.childHeader}>
        <Text style={styles.childName}>{item.name}</Text>
      </View>

      <View style={styles.childDetails}>
        <Text style={styles.detailText}>
          الفصل:{" "}
          {item.class
            ? `${item.class.stage} - ${item.class.grade}`
            : "غير محدد"}
        </Text>
        <Text style={styles.detailText}>ولي الأمر: {item.parentName}</Text>
        {item.phone && (
          <Text style={styles.detailText}>التليفون: {item.phone}</Text>
        )}
        {item.notes && (
          <Text style={styles.detailText}>ملاحظات: {item.notes}</Text>
        )}
      </View>

      <View style={styles.childActions}>
        <TouchableOpacity
          style={styles.statsButton}
          onPress={() => openStatsModal(item)}
        >
          <Text style={styles.statsButtonText}>📊 إحصائيات</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.editButtonText}>تعديل</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteChild(item._id)}
        >
          <Text style={styles.deleteButtonText}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>جاري تحميل بيانات الأطفال...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="البحث عن طفل..."
          value={searchText}
          onChangeText={setSearchText}
          textAlign="right"
        />

        {user?.role === "admin" && (
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>تصفية بالفصل:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  selectedClass === "" && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedClass("")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedClass === "" && styles.filterButtonTextActive,
                  ]}
                >
                  الكل
                </Text>
              </TouchableOpacity>

              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls._id}
                  style={[
                    styles.filterButton,
                    selectedClass === cls._id && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedClass(cls._id)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      selectedClass === cls._id &&
                        styles.filterButtonTextActive,
                    ]}
                  >
                    {cls.stage} - {cls.grade}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Children List */}
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
            <Text style={styles.emptyText}>لا توجد أطفال</Text>
            <Text style={styles.emptySubtext}>
              اضغط على زر + لإضافة طفل جديد
            </Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Text style={styles.addButtonText}>+ إضافة طفل</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
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
            <Text style={styles.modalTitle}>
              {editingChild ? "تعديل بيانات الطفل" : "إضافة طفل جديد"}
            </Text>
            <TouchableOpacity onPress={handleSaveChild}>
              <Text style={styles.modalSaveButton}>حفظ</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>اسم الطفل *</Text>
              <TextInput
                style={styles.formInput}
                value={childForm.name}
                onChangeText={(text) =>
                  setChildForm({ ...childForm, name: text })
                }
                placeholder="ادخل اسم الطفل"
                textAlign="right"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>رقم التليفون (اختياري)</Text>
              <TextInput
                style={styles.formInput}
                value={childForm.phone}
                onChangeText={(text) =>
                  setChildForm({ ...childForm, phone: text })
                }
                placeholder="ادخل رقم التليفون (اختياري)"
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>ملاحظات (اختياري)</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={childForm.notes}
                onChangeText={(text) =>
                  setChildForm({ ...childForm, notes: text })
                }
                placeholder="ادخل أي ملاحظات إضافية (اختياري)"
                multiline
                numberOfLines={4}
                textAlign="right"
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Child Statistics Modal */}
      <ChildStatisticsModal
        visible={statsModalVisible}
        childId={selectedChildForStats?._id}
        childName={selectedChildForStats?.name}
        onClose={closeStatsModal}
      />
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
  filterContainer: {
    marginTop: 10,
  },
  filterLabel: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 8,
    textAlign: "right",
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  filterButtonActive: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  listContainer: {
    padding: 15,
  },
  childCard: {
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
  childHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  childName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    flex: 1,
    textAlign: "right",
  },
  childAge: {
    fontSize: 14,
    color: "#3498db",
    fontWeight: "600",
  },
  childDetails: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 5,
    textAlign: "right",
  },
  childActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  statsButton: {
    backgroundColor: "#f39c12",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
  },
  statsButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginLeft: 8,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: "#7f8c8d",
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#bdc3c7",
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#27ae60",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    color: "#2c3e50",
    marginBottom: 8,
    textAlign: "right",
    fontWeight: "600",
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  textArea: {
    height: 100,
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
});

export default ChildrenScreen;
