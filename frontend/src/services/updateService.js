import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

class UpdateService {
  static UPDATE_CHECK_KEY = 'last_update_check';
  static CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 ساعة

  /**
   * التحقق من وجود تحديثات متوفرة
   */
  static async checkForUpdates(showAlert = false) {
    try {
      // التحقق من أن التطبيق يعمل في بيئة Expo
      if (!Updates.isEnabled) {
        console.log('تحديثات Expo غير مفعلة في هذا التطبيق');
        if (showAlert) {
          Alert.alert(
            'تحديثات غير متاحة',
            'التحديثات التلقائية تعمل فقط في التطبيق المنشور، وليس في Expo Go.',
            [{ text: 'موافق', style: 'default' }]
          );
        }
        return false;
      }

      // فحص إضافي للتأكد من أننا لسنا في Expo Go
      if (__DEV__ || Updates.isEmbeddedLaunch) {
        console.log('� التطبيق يعمل في وضع التطوير أو Expo Go - التحديثات التلقائية غير متاحة');
        if (showAlert) {
          Alert.alert(
            'وضع التطوير',
            'التحديثات التلقائية تعمل فقط في التطبيق المنشور.\n\nحالياً التطبيق يعمل في وضع التطوير أو Expo Go.',
            [{ text: 'موافق', style: 'default' }]
          );
        }
        return false;
      }

      console.log('�🔍 جاري البحث عن تحديثات...');
      
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('✅ تحديث متوفر!');
        
        if (showAlert) {
          this.showUpdateAlert();
        }
        
        return true;
      } else {
        console.log('ℹ️ لا توجد تحديثات متوفرة');
        
        if (showAlert) {
          Alert.alert(
            'لا توجد تحديثات',
            'التطبيق محدث للإصدار الأحدث',
            [{ text: 'موافق', style: 'default' }]
          );
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ خطأ في التحقق من التحديثات:', error);
      
      // فحص إذا كان الخطأ متعلق بـ Expo Go
      if (error.message && error.message.includes('not supported in Expo Go')) {
        console.log('🔧 التطبيق يعمل في Expo Go - التحديثات غير مدعومة');
        if (showAlert) {
          Alert.alert(
            'Expo Go',
            'التحديثات التلقائية لا تعمل في Expo Go.\n\nستعمل فقط عند نشر التطبيق كـ APK أو في App Store.',
            [{ text: 'فهمت', style: 'default' }]
          );
        }
        return false;
      }
      
      if (showAlert) {
        Alert.alert(
          'خطأ',
          'حدث خطأ أثناء التحقق من التحديثات. تأكد من اتصالك بالإنترنت.',
          [{ text: 'موافق', style: 'default' }]
        );
      }
      
      return false;
    }
  }

  /**
   * تحميل وتطبيق التحديث
   */
  static async downloadAndApplyUpdate() {
    try {
      console.log('📥 جاري تحميل التحديث...');
      
      const result = await Updates.fetchUpdateAsync();
      
      if (result.isNew) {
        console.log('✅ تم تحميل التحديث بنجاح!');
        
        Alert.alert(
          'تم تحميل التحديث',
          'سيتم إعادة تشغيل التطبيق لتطبيق التحديث الجديد.',
          [
            {
              text: 'لاحقاً',
              style: 'cancel'
            },
            {
              text: 'إعادة تشغيل الآن',
              onPress: () => Updates.reloadAsync(),
              style: 'default'
            }
          ]
        );
        
        return true;
      } else {
        console.log('ℹ️ لم يتم تحميل تحديث جديد');
        return false;
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل التحديث:', error);
      
      Alert.alert(
        'خطأ في التحديث',
        'حدث خطأ أثناء تحميل التحديث. يرجى المحاولة مرة أخرى لاحقاً.',
        [{ text: 'موافق', style: 'default' }]
      );
      
      return false;
    }
  }

  /**
   * عرض تنبيه للمستخدم بوجود تحديث
   */
  static showUpdateAlert() {
    Alert.alert(
      'تحديث متوفر',
      'يتوفر إصدار جديد من التطبيق. هل تريد تحميله الآن؟',
      [
        {
          text: 'لاحقاً',
          style: 'cancel'
        },
        {
          text: 'تحميل الآن',
          onPress: () => this.downloadAndApplyUpdate(),
          style: 'default'
        }
      ]
    );
  }

  /**
   * التحقق التلقائي من التحديثات عند بدء التطبيق
   */
  static async checkForUpdatesOnStart() {
    try {
      // فحص سريع للتأكد من أن التحديثات مدعومة
      if (!Updates.isEnabled || __DEV__ || Updates.isEmbeddedLaunch) {
        console.log('🔧 تم تخطي فحص التحديثات - التطبيق في وضع التطوير أو Expo Go');
        return;
      }

      // التحقق من آخر مرة تم فيها البحث عن تحديثات
      const lastCheck = await AsyncStorage.getItem(this.UPDATE_CHECK_KEY);
      const now = Date.now();
      
      if (lastCheck) {
        const timeSinceLastCheck = now - parseInt(lastCheck);
        if (timeSinceLastCheck < this.CHECK_INTERVAL) {
          console.log('تم التحقق من التحديثات مؤخراً');
          return;
        }
      }

      // التحقق من التحديثات (بدون عرض تنبيهات)
      const updateAvailable = await this.checkForUpdates(false);
      
      if (updateAvailable) {
        // تأخير عرض التنبيه قليلاً حتى يكتمل تحميل التطبيق
        setTimeout(() => {
          this.showUpdateAlert();
        }, 2000);
      }

      // حفظ وقت آخر فحص
      await AsyncStorage.setItem(this.UPDATE_CHECK_KEY, now.toString());
      
    } catch (error) {
      console.error('❌ خطأ في الفحص التلقائي للتحديثات:', error);
    }
  }

  /**
   * التحقق اليدوي من التحديثات (من إعدادات التطبيق)
   */
  static async manualUpdateCheck() {
    const updateAvailable = await this.checkForUpdates(true);
    
    if (updateAvailable) {
      this.showUpdateAlert();
    }
  }

  /**
   * الحصول على معلومات التحديث الحالي
   */
  static async getCurrentUpdateInfo() {
    try {
      if (!Updates.isEnabled || __DEV__ || Updates.isEmbeddedLaunch) {
        return {
          updateId: 'development',
          channel: 'development',
          runtimeVersion: 'dev',
          manifest: null,
          isEmergencyLaunch: false,
          isEmbeddedLaunch: true,
          isDevelopment: true
        };
      }

      const manifest = Updates.manifest;
      const updateId = Updates.updateId;
      const channel = Updates.channel;
      const runtimeVersion = Updates.runtimeVersion;

      return {
        updateId,
        channel,
        runtimeVersion,
        manifest,
        isEmergencyLaunch: Updates.isEmergencyLaunch,
        isEmbeddedLaunch: Updates.isEmbeddedLaunch
      };
    } catch (error) {
      console.error('خطأ في الحصول على معلومات التحديث:', error);
      return null;
    }
  }

  /**
   * إعادة تعيين cache التحديثات (مفيد في حالة مشاكل التخزين المؤقت)
   */
  static async clearUpdateCache() {
    try {
      await AsyncStorage.removeItem(this.UPDATE_CHECK_KEY);
      console.log('تم مسح cache التحديثات');
      
      Alert.alert(
        'تم مسح التخزين المؤقت',
        'تم مسح بيانات التحديثات المؤقتة. سيتم فحص التحديثات في المرة القادمة.',
        [{ text: 'موافق', style: 'default' }]
      );
    } catch (error) {
      console.error('خطأ في مسح cache التحديثات:', error);
    }
  }
}

export default UpdateService;
