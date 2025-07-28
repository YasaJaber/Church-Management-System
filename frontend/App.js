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

    const initializeApp = async () => {
      try {
        console.log('🚀 بدء تحميل التطبيق...');
        
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
            
            console.log('✅ تم إعداد خدمة الإشعارات بنجاح');
          } catch (error) {
            console.error('❌ خطأ في إعداد خدمة الإشعارات:', error);
            // لا نوقف التطبيق بسبب خطأ في الإشعارات
          }
        };

        // إعداد خدمة التحديثات التلقائية (معطلة مؤقتاً)
        const initializeUpdates = async () => {
          try {
            console.log('🔄 تخطي فحص التحديثات (معطل مؤقتاً)...');
            // await UpdateService.checkForUpdatesOnStart();
            console.log('✅ تم تخطي خدمة التحديثات');
          } catch (error) {
            console.error('❌ خطأ في إعداد خدمة التحديثات:', error);
            // لا نوقف التطبيق بسبب خطأ في التحديثات
          }
        };

        // تشغيل الخدمات
        await initializeNotifications();
        await initializeUpdates();
        
        // تأخير قصير للتأكد من اكتمال التحميل
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (isMounted) {
          setIsLoading(false);
          console.log('✅ تم تحميل التطبيق بنجاح');
        }
      } catch (error) {
        console.error('❌ خطأ في تحميل التطبيق:', error);
        if (isMounted) {
          setLoadingError(error);
          setIsLoading(false);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []);

  // Loading Screen
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
