import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpdateService from '../services/updateService';

const UpdateSettingsScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [lastCheckTime, setLastCheckTime] = useState(null);

  useEffect(() => {
    loadUpdateSettings();
    loadUpdateInfo();
    loadLastCheckTime();
  }, []);

  const loadUpdateSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('auto_update_enabled');
      if (enabled !== null) {
        setAutoUpdateEnabled(JSON.parse(enabled));
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات التحديث:', error);
    }
  };

  const loadUpdateInfo = async () => {
    try {
      const info = await UpdateService.getCurrentUpdateInfo();
      setUpdateInfo(info);
    } catch (error) {
      console.error('خطأ في تحميل معلومات التحديث:', error);
    }
  };

  const loadLastCheckTime = async () => {
    try {
      const lastCheck = await AsyncStorage.getItem(UpdateService.UPDATE_CHECK_KEY);
      if (lastCheck) {
        setLastCheckTime(new Date(parseInt(lastCheck)));
      }
    } catch (error) {
      console.error('خطأ في تحميل وقت آخر فحص:', error);
    }
  };

  const toggleAutoUpdate = async (value) => {
    try {
      setAutoUpdateEnabled(value);
      await AsyncStorage.setItem('auto_update_enabled', JSON.stringify(value));
      
      Alert.alert(
        'تم حفظ الإعدادات',
        value 
          ? 'تم تفعيل التحقق التلقائي من التحديثات'
          : 'تم إيقاف التحقق التلقائي من التحديثات',
        [{ text: 'موافق', style: 'default' }]
      );
    } catch (error) {
      console.error('خطأ في حفظ إعدادات التحديث:', error);
    }
  };

  const handleManualCheck = async () => {
    setIsLoading(true);
    try {
      await UpdateService.manualUpdateCheck();
      await loadLastCheckTime();
    } catch (error) {
      console.error('خطأ في الفحص اليدوي:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'مسح التخزين المؤقت',
      'هل أنت متأكد من أنك تريد مسح بيانات التحديثات المؤقتة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح',
          style: 'destructive',
          onPress: async () => {
            await UpdateService.clearUpdateCache();
            await loadLastCheckTime();
          }
        }
      ]
    );
  };

  const formatDate = (date) => {
    if (!date) return 'غير متوفر';
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* تحذير وضع التطوير */}
      {updateInfo?.isDevelopment && (
        <View style={styles.warningSection}>
          <Text style={styles.warningTitle}>🔧 وضع التطوير</Text>
          <Text style={styles.warningText}>
            التحديثات التلقائية لا تعمل في Expo Go أو وضع التطوير.
            ستعمل فقط عند نشر التطبيق كـ APK أو في متجر التطبيقات.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>إعدادات التحديث</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>التحقق التلقائي من التحديثات</Text>
            <Text style={styles.settingDescription}>
              {updateInfo?.isDevelopment 
                ? 'غير متاح في وضع التطوير' 
                : 'فحص التحديثات تلقائياً عند فتح التطبيق'
              }
            </Text>
          </View>
          <Switch
            value={autoUpdateEnabled}
            onValueChange={toggleAutoUpdate}
            disabled={updateInfo?.isDevelopment}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={autoUpdateEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>إجراءات التحديث</Text>
        
        <TouchableOpacity
          style={[
            styles.button, 
            styles.checkButton, 
            updateInfo?.isDevelopment && styles.disabledButton
          ]}
          onPress={handleManualCheck}
          disabled={isLoading || updateInfo?.isDevelopment}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {updateInfo?.isDevelopment ? 'غير متاح في وضع التطوير' : 'فحص التحديثات الآن'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClearCache}
        >
          <Text style={styles.buttonText}>مسح التخزين المؤقت</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات التحديث</Text>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>آخر فحص للتحديثات:</Text>
          <Text style={styles.infoValue}>{formatDate(lastCheckTime)}</Text>
        </View>

        {updateInfo && (
          <>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>إصدار التشغيل:</Text>
              <Text style={styles.infoValue}>{updateInfo.runtimeVersion || 'غير متوفر'}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>قناة التحديث:</Text>
              <Text style={styles.infoValue}>{updateInfo.channel || 'default'}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>نوع الإطلاق:</Text>
              <Text style={styles.infoValue}>
                {updateInfo.isEmbeddedLaunch 
                  ? 'مدمج في التطبيق' 
                  : updateInfo.isEmergencyLaunch 
                    ? 'طوارئ' 
                    : 'تحديث OTA'
                }
              </Text>
            </View>

            {updateInfo.updateId && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>معرف التحديث:</Text>
                <Text style={[styles.infoValue, styles.updateId]}>
                  {updateInfo.updateId.substring(0, 8)}...
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>نصائح مهمة</Text>
        <View style={styles.tipsContainer}>
          <Text style={styles.tipText}>
            • التحديثات التلقائية تعمل فقط مع التطبيقات المنشورة، وليس في Expo Go
          </Text>
          <Text style={styles.tipText}>
            • في وضع التطوير، ستحتاج لنشر التطبيق كـ APK أو في متجر التطبيقات
          </Text>
          <Text style={styles.tipText}>
            • تأكد من اتصالك بالإنترنت للحصول على التحديثات
          </Text>
          <Text style={styles.tipText}>
            • إذا واجهت مشاكل، جرب مسح التخزين المؤقت
          </Text>
          <Text style={styles.tipText}>
            • التحديثات لا تؤثر على البيانات المحفوظة محلياً
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
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
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'right',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    marginBottom: 5,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: '#34C759',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  updateId: {
    fontFamily: 'monospace',
  },
  warningSection: {
    backgroundColor: '#fff3cd',
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
    textAlign: 'right',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'right',
    lineHeight: 20,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  tipsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default UpdateSettingsScreen;
