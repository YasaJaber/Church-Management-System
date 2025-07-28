import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/components/AppNavigator";
import NotificationService from "./src/services/notificationService";
import UpdateService from "./src/services/updateService";

export default function App() {
  useEffect(() => {
    // إعداد معالجات الإشعارات عند بدء التطبيق
    const initializeNotifications = async () => {
      try {
        // إعداد معالجات الإشعارات
        NotificationService.setupNotificationHandlers();
        
        // طلب الأذونات إذا كانت الإشعارات مفعلة
        const notificationsEnabled = await NotificationService.areNotificationsEnabled();
        if (notificationsEnabled) {
          await NotificationService.requestPermissions();
        }
        
        console.log('تم إعداد خدمة الإشعارات بنجاح');
      } catch (error) {
        console.error('خطأ في إعداد خدمة الإشعارات:', error);
      }
    };

    // إعداد خدمة التحديثات التلقائية
    const initializeUpdates = async () => {
      try {
        console.log('🔄 بدء فحص التحديثات...');
        await UpdateService.checkForUpdatesOnStart();
        console.log('✅ تم إعداد خدمة التحديثات بنجاح');
      } catch (error) {
        console.error('❌ خطأ في إعداد خدمة التحديثات:', error);
      }
    };

    // تشغيل الخدمات
    initializeNotifications();
    initializeUpdates();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  );
}
