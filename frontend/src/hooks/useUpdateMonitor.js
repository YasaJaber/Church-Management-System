import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpdateService from '../services/updateService';

/**
 * Hook لمراقبة التحديثات التلقائية في الخلفية
 */
const useUpdateMonitor = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let checkInterval;
    
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active') {
        // التحقق من التحديثات عند العودة للتطبيق
        checkForUpdatesInBackground();
      }
    };

    const checkForUpdatesInBackground = async () => {
      try {
        setIsChecking(true);
        
        // فحص سريع للتأكد من أن التحديثات مدعومة
        const UpdatesModule = await import('expo-updates');
        if (!UpdatesModule.isEnabled || __DEV__ || UpdatesModule.isEmbeddedLaunch) {
          console.log('🔧 تم تخطي فحص التحديثات - التطبيق في وضع التطوير أو Expo Go');
          setIsChecking(false);
          return;
        }
        
        // التحقق من آخر مرة تم فيها البحث
        const lastCheck = await AsyncStorage.getItem(UpdateService.UPDATE_CHECK_KEY);
        const now = Date.now();
        
        if (lastCheck) {
          const timeSinceLastCheck = now - parseInt(lastCheck);
          // فحص كل 6 ساعات فقط
          if (timeSinceLastCheck < (6 * 60 * 60 * 1000)) {
            setIsChecking(false);
            return;
          }
        }

        // التحقق من وجود تحديثات
        const hasUpdate = await UpdateService.checkForUpdates(false);
        setUpdateAvailable(hasUpdate);
        
        // حفظ وقت آخر فحص
        await AsyncStorage.setItem(UpdateService.UPDATE_CHECK_KEY, now.toString());
        
      } catch (error) {
        console.error('خطأ في المراقبة التلقائية للتحديثات:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // فحص دوري كل 30 دقيقة
    const startPeriodicCheck = () => {
      checkInterval = setInterval(() => {
        if (AppState.currentState === 'active') {
          checkForUpdatesInBackground();
        }
      }, 30 * 60 * 1000); // 30 دقيقة
    };

    // إعداد مراقب حالة التطبيق
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // بدء الفحص الدوري
    startPeriodicCheck();
    
    // فحص فوري عند التشغيل
    checkForUpdatesInBackground();

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      appStateSubscription?.remove();
    };
  }, []);

  const checkManually = async () => {
    setIsChecking(true);
    try {
      const hasUpdate = await UpdateService.checkForUpdates(true);
      setUpdateAvailable(hasUpdate);
      return hasUpdate;
    } catch (error) {
      console.error('خطأ في الفحص اليدوي:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  return {
    updateAvailable,
    isChecking,
    checkManually,
    dismissUpdate
  };
};

export default useUpdateMonitor;
