import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/components/AppNavigator";
import NotificationService from "./src/services/notificationService";
import UpdateService from "./src/services/updateService";
import { View, Text, ActivityIndicator } from "react-native";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 20,
          backgroundColor: '#ffffff'
        }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            marginBottom: 10,
            textAlign: 'center'
          }}>
            حدث خطأ في التطبيق
          </Text>
          <Text style={{ 
            textAlign: 'center', 
            marginBottom: 20,
            fontSize: 16
          }}>
            يرجى إعادة تشغيل التطبيق
          </Text>
          <Text style={{ 
            fontSize: 12, 
            color: 'gray',
            textAlign: 'center'
          }}>
            {this.state.error?.toString()}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    const initializeApp = async () => {
      try {
        console.log('🚀 بدء تحميل التطبيق...');
        
        // تأخير قصير للسماح للنظام بالتحميل
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // تهيئة الخدمات بشكل مبسط
        try {
          // تهيئة الإشعارات (غير إجبارية)
          console.log('🔔 إعداد الإشعارات...');
          NotificationService.setupNotificationHandlers();
          console.log('✅ تم إعداد الإشعارات');
        } catch (error) {
          console.warn('⚠️ تخطي إعداد الإشعارات:', error.message);
        }

        // تخطي خدمة التحديثات تماماً
        console.log('✅ تخطي خدمة التحديثات');
        
        if (isMounted) {
          setIsLoading(false);
          console.log('✅ تم تحميل التطبيق بنجاح');
        }
      } catch (error) {
        console.error('❌ خطأ في تحميل التطبيق:', error);
        if (isMounted) {
          // في حالة الخطأ، تشغيل التطبيق رغم ذلك
          setIsLoading(false);
          console.warn('⚠️ تم تشغيل التطبيق رغم الخطأ');
        }
      }
    };

    // إعداد timeout للأمان - إذا لم يكتمل التحميل خلال 5 ثوانٍ
    timeoutId = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('⏱️ انتهت مهلة التحميل - تشغيل التطبيق قسرياً');
        setIsLoading(false);
      }
    }, 5000);

    // تشغيل التهيئة مع تأخير قصير
    const timer = setTimeout(initializeApp, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Loading Screen مع timeout للأمان
  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff'
      }}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={{
          marginTop: 20,
          fontSize: 16,
          textAlign: 'center'
        }}>
          جاري تحميل التطبيق...
        </Text>
        <Text style={{
          marginTop: 10,
          fontSize: 12,
          color: 'gray',
          textAlign: 'center'
        }}>
          إذا استغرق الأمر وقتاً طويلاً، أعد تشغيل التطبيق
        </Text>
      </View>
    );
  }

  // Error Screen
  if (loadingError) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ffffff'
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          marginBottom: 10,
          textAlign: 'center'
        }}>
          فشل في تحميل التطبيق
        </Text>
        <Text style={{
          textAlign: 'center',
          marginBottom: 20,
          fontSize: 16
        }}>
          يرجى إعادة تشغيل التطبيق
        </Text>
        <Text style={{
          fontSize: 12,
          color: 'gray',
          textAlign: 'center'
        }}>
          {loadingError.toString()}
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
