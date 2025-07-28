import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpdateService from '../services/updateService';

const UpdateNotificationModal = ({ 
  visible, 
  onClose, 
  updateAvailable = false,
  autoCheck = true 
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const slideAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleDownloadUpdate = async () => {
    setIsDownloading(true);
    setError(null);
    
    try {
      // محاكاة تقدم التحميل
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const success = await UpdateService.downloadAndApplyUpdate();
      
      clearInterval(progressInterval);
      setDownloadProgress(100);
      
      if (success) {
        // حفظ معلومات التحديث الناجح
        await AsyncStorage.setItem('last_successful_update', Date.now().toString());
        setTimeout(() => {
          setIsDownloading(false);
          onClose();
        }, 1000);
      } else {
        setError('فشل في تحميل التحديث');
        setIsDownloading(false);
      }
      
    } catch (error) {
      console.error('خطأ في تحميل التحديث:', error);
      setError('حدث خطأ أثناء التحميل');
      setIsDownloading(false);
    }
  };

  const handleLater = async () => {
    // تأجيل التحديث لـ 24 ساعة
    const delayUntil = Date.now() + (24 * 60 * 60 * 1000);
    await AsyncStorage.setItem('update_delayed_until', delayUntil.toString());
    onClose();
  };

  const handleSkipVersion = async () => {
    try {
      const updateInfo = await UpdateService.getCurrentUpdateInfo();
      if (updateInfo?.updateId) {
        await AsyncStorage.setItem('skipped_update_id', updateInfo.updateId);
      }
      onClose();
    } catch (error) {
      console.error('خطأ في تخطي الإصدار:', error);
      onClose();
    }
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={closeModal}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {updateAvailable ? '🎉 تحديث جديد متوفر!' : '🔄 فحص التحديثات'}
            </Text>
          </View>

          <View style={styles.content}>
            {isDownloading ? (
              <View style={styles.downloadContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.downloadText}>
                  جاري تحميل التحديث... {downloadProgress}%
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${downloadProgress}%` }
                    ]} 
                  />
                </View>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : updateAvailable ? (
              <View style={styles.updateInfo}>
                <Text style={styles.description}>
                  يتوفر إصدار جديد من التطبيق يحتوي على تحسينات وإصلاحات جديدة.
                </Text>
                <Text style={styles.benefits}>
                  • إصلاح الأخطاء{'\n'}
                  • تحسين الأداء{'\n'}
                  • ميزات جديدة{'\n'}
                  • تحسين الأمان
                </Text>
              </View>
            ) : (
              <View style={styles.noUpdateContainer}>
                <Text style={styles.noUpdateIcon}>✅</Text>
                <Text style={styles.noUpdateText}>
                  التطبيق محدث للإصدار الأحدث
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            {updateAvailable && !isDownloading && !error && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleDownloadUpdate}
                >
                  <Text style={styles.primaryButtonText}>تحديث الآن</Text>
                </TouchableOpacity>

                <View style={styles.secondaryActions}>
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleLater}
                  >
                    <Text style={styles.secondaryButtonText}>لاحقاً</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleSkipVersion}
                  >
                    <Text style={styles.secondaryButtonText}>تخطي هذا الإصدار</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {(error || (!updateAvailable && !isDownloading)) && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={closeModal}
              >
                <Text style={styles.primaryButtonText}>موافق</Text>
              </TouchableOpacity>
            )}

            {!updateAvailable && !isDownloading && !error && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => UpdateService.manualUpdateCheck()}
              >
                <Text style={styles.secondaryButtonText}>فحص مرة أخرى</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 0,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    backgroundColor: '#3498db',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  downloadContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  downloadText: {
    fontSize: 16,
    color: '#333',
    marginTop: 15,
    marginBottom: 15,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 3,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  updateInfo: {
    paddingVertical: 10,
  },
  description: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 24,
  },
  benefits: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    textAlign: 'right',
    lineHeight: 22,
  },
  noUpdateContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noUpdateIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  noUpdateText: {
    fontSize: 16,
    color: '#27ae60',
    textAlign: 'center',
    fontWeight: '500',
  },
  actions: {
    padding: 20,
    paddingTop: 0,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  primaryButton: {
    backgroundColor: '#3498db',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#ecf0f1',
    flex: 1,
    marginHorizontal: 5,
  },
  secondaryButtonText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UpdateNotificationModal;
