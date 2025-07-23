import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";

const LoginScreen = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error, clearError } = useAuth();

  // Load saved credentials if remember me was enabled
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  // Clear error when component unmounts or inputs change
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [username, password]);

  const loadSavedCredentials = async () => {
    try {
      const savedRememberMe = await AsyncStorage.getItem("rememberMe");
      if (savedRememberMe === "true") {
        const savedUserData = await AsyncStorage.getItem("userData");
        if (savedUserData) {
          const userData = JSON.parse(savedUserData);
          setUsername(userData.username || "");
          setRememberMe(true);
        }
      }
    } catch (error) {
      console.error("Error loading saved credentials:", error);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    const result = await login(username.trim(), password, rememberMe);

    if (!result.success) {
      Alert.alert("خطأ في تسجيل الدخول", result.error);
    }
  };

  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.loginContainer}>
        {/* Church Logo/Title */}
        <View style={styles.header}>
          <Image 
            source={require('../../assets/saint-george.png')} 
            style={styles.saintImage}
            resizeMode="contain"
          />
          <Text style={styles.churchName}>كنيسة الشهيد العظيم مارجرجس</Text>
          <Text style={styles.location}>بأولاد علي</Text>
          <Text style={styles.appTitle}>نظام متابعة الحضور والغياب</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>اسم المستخدم</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="ادخل اسم المستخدم"
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="right"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>كلمة المرور</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="ادخل كلمة المرور"
                secureTextEntry={!showPassword}
                textAlign="right"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={toggleShowPassword}
              >
                <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me Checkbox */}
          <TouchableOpacity
            style={styles.rememberMeContainer}
            onPress={toggleRememberMe}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
            >
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberMeText}>تذكرني</Text>
          </TouchableOpacity>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            للحصول على حساب جديد، يرجى التواصل مع أمين الخدمة
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  churchName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 5,
  },
  location: {
    fontSize: 20,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },
  appTitle: {
    fontSize: 16,
    color: "#34495e",
    textAlign: "center",
    fontWeight: "600",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: "absolute",
    right: 15,
    top: 12,
    padding: 5,
  },
  eyeText: {
    fontSize: 18,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    justifyContent: "flex-end",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#3498db",
    borderRadius: 3,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3498db",
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  rememberMeText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 14,
    textAlign: "right",
  },
  loginButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonDisabled: {
    backgroundColor: "#bdc3c7",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 20,
  },
  saintImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    borderRadius: 60,
  },
});

export default LoginScreen;
