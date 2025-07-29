import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import ChildrenScreen from "../screens/ChildrenScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import StatisticsScreen from "../screens/StatisticsScreen";
import ServantsScreen from "../screens/ServantsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PastoralCareScreen from "../screens/PastoralCareScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator for Servants
const ServantTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#3498db",
        tabBarInactiveTintColor: "#7f8c8d",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e1e1e1",
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#3498db",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 18,
        },
        headerTitleAlign: "center",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Children"
        component={ChildrenScreen}
        options={{
          title: "الأطفال",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👶</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          title: "الحضور",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📝</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          title: "الإحصائيات",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="PastoralCare"
        component={PastoralCareScreen}
        options={{
          title: "الافتقاد",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🤝</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "الحساب",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Tab Navigator for Admin
const AdminTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#e74c3c",
        tabBarInactiveTintColor: "#7f8c8d",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e1e1e1",
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#e74c3c",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 18,
        },
        headerTitleAlign: "center",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Children"
        component={ChildrenScreen}
        options={{
          title: "الأطفال",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👶</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          title: "الحضور",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📝</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          title: "الإحصائيات",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="PastoralCare"
        component={PastoralCareScreen}
        options={{
          title: "الافتقاد",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🤝</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Servants"
        component={ServantsScreen}
        options={{
          title: "الخدام",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "الحساب",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main Stack Navigator
const MainStack = () => {
  const { user } = useAuth();

  // Determine which tab navigator to show based on user role
  const TabNavigator = user?.role === "admin" ? AdminTabs : ServantTabs;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
    </Stack.Navigator>
  );
};

// Auth Stack Navigator
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

// Loading Screen Component
const LoadingScreen = () => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3498db" />
      <Text style={styles.loadingText}>جاري التحميل...</Text>
    </View>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
  },
});

export default AppNavigator;
