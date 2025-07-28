import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد من تسجيل الخروج؟", [
      {
        text: "إلغاء",
        style: "cancel",
      },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/saint-george.png')} 
          style={styles.saintImage}
          resizeMode="contain"
        />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>
          {user?.role === "admin" ? "أمين الخدمة" : "خادم"}
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>معلومات الحساب</Text>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>اسم المستخدم:</Text>
          <Text style={styles.infoValue}>{user?.username}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>الاسم:</Text>
          <Text style={styles.infoValue}>{user?.name}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>النوع:</Text>
          <Text style={styles.infoValue}>
            {user?.role === "admin" ? "أمين الخدمة" : "خادم"}
          </Text>
        </View>

        {user?.assignedClass && (
          <>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>المرحلة المخصصة:</Text>
              <Text style={styles.infoValue}>{user.assignedClass.stage}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>الفصل المخصص:</Text>
              <Text style={styles.infoValue}>{user.assignedClass.grade}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.updateButton} 
          onPress={() => navigation.navigate('UpdateSettings')}
        >
          <Text style={styles.updateButtonText}>🔄 إعدادات التحديث</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>🚪 تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>نظام متابعة الحضور والغياب</Text>
        <Text style={styles.footerText}>
          كنيسة الشهيد العظيم مارجرجس
        </Text>
        <Text style={styles.footerText}>
          بأولاد علي
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 30,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 5,
  },
  role: {
    fontSize: 16,
    color: "#3498db",
    marginBottom: 10,
  },
  infoSection: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  infoLabel: {
    fontSize: 16,
    color: "#7f8c8d",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 16,
    color: "#2c3e50",
    textAlign: "right",
    flex: 1,
    marginLeft: 10,
  },
  actionsSection: {
    margin: 15,
  },
  updateButton: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#e74c3c",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 3,
    fontWeight: "500",
  },
  saintImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 50,
  },
});

export default ProfileScreen;
