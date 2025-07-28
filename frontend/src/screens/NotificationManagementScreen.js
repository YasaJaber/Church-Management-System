import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import NotificationService, { BIBLE_VERSES } from '../services/notificationService';

const NotificationManagementScreen = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState({ hour: 8, minute: 0 });
  const [stats, setStats] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showVerseModal, setShowVerseModal] = useState(false);
  const [showAddVerseModal, setShowAddVerseModal] = useState(false);
  const [newVerseForm, setNewVerseForm] = useState({ verse: '', reference: '' });
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [customVerses, setCustomVerses] = useState([]);
  const [thursdayReminderEnabled, setThursdayReminderEnabled] = useState(false);
  const [thursdayReminderTime, setThursdayReminderTime] = useState({ hour: 20, minute: 0 });
  const [showThursdayTimeModal, setShowThursdayTimeModal] = useState(false);

  useEffect(() => {
    if (visible) {
      loadNotificationSettings();
    }
  }, [visible]);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      
      // تحميل الإعدادات الحالية
      const enabled = await NotificationService.areNotificationsEnabled();
      const time = await NotificationService.getNotificationTime();
      const notificationStats = await NotificationService.getNotificationStats();
      const customVersesData = await NotificationService.getCustomVerses();
      const thursdayEnabled = await NotificationService.isThursdayReminderEnabled();
      const thursdayTime = await NotificationService.getThursdayReminderTime();

      setNotificationsEnabled(enabled);
      setNotificationTime(time);
      setStats(notificationStats);
      setCustomVerses(customVersesData);
      setThursdayReminderEnabled(thursdayEnabled);
      setThursdayReminderTime(thursdayTime);

      // إعداد معالجات الإشعارات
      NotificationService.setupNotificationHandlers();
    } catch (error) {
      console.error('خطأ في تحميل إعدادات الإشعارات:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async (value) => {
    try {
      if (value) {
        const success = await NotificationService.enableDailyNotifications(notificationTime);
        if (success) {
          setNotificationsEnabled(true);
          Alert.alert('تم التفعيل', 'تم تفعيل الإشعارات اليومية بنجاح! ستصلك آية من الكتاب المقدس يومياً في الوقت المحدد.');
        } else {
          Alert.alert('فشل', 'لم يتم تفعيل الإشعارات. تأكد من منح الأذونات اللازمة.');
        }
      } else {
        const success = await NotificationService.cancelDailyNotifications();
        if (success) {
          setNotificationsEnabled(false);
          Alert.alert('تم الإلغاء', 'تم إلغاء الإشعارات اليومية');
        }
      }
      
      // إعادة تحميل الإحصائيات
      const updatedStats = await NotificationService.getNotificationStats();
      setStats(updatedStats);
    } catch (error) {
      console.error('خطأ في تبديل حالة الإشعارات:', error);
      Alert.alert('خطأ', 'حدث خطأ في تعديل الإشعارات');
    }
  };

  const handleToggleThursdayReminder = async (value) => {
    try {
      if (value) {
        const success = await NotificationService.enableThursdayMassReminder(thursdayReminderTime);
        if (success) {
          setThursdayReminderEnabled(true);
          Alert.alert('تم التفعيل', 'تم تفعيل تذكير الخميس للخدام! سيصلك تذكير كل خميس لحضور القداس بدري.');
        } else {
          Alert.alert('فشل', 'لم يتم تفعيل تذكير الخميس. تأكد من منح الأذونات اللازمة.');
        }
      } else {
        const success = await NotificationService.cancelThursdayMassReminder();
        if (success) {
          setThursdayReminderEnabled(false);
          Alert.alert('تم الإلغاء', 'تم إلغاء تذكير الخميس للخدام');
        }
      }
      
      // إعادة تحميل الإحصائيات
      const updatedStats = await NotificationService.getNotificationStats();
      setStats(updatedStats);
    } catch (error) {
      console.error('خطأ في تبديل حالة تذكير الخميس:', error);
      Alert.alert('خطأ', 'حدث خطأ في تعديل تذكير الخميس');
    }
  };

  const handleTimeChange = async (newTime) => {
    try {
      setNotificationTime(newTime);
      
      if (notificationsEnabled) {
        // إعادة جدولة الإشعارات بالوقت الجديد
        const success = await NotificationService.enableDailyNotifications(newTime);
        if (success) {
          Alert.alert('تم التحديث', `تم تحديث وقت الإشعار إلى ${formatTime(newTime)}`);
        }
      }
      
      setShowTimeModal(false);
    } catch (error) {
      console.error('خطأ في تحديث وقت الإشعار:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحديث الوقت');
    }
  };

  const handleThursdayTimeChange = async (newTime) => {
    try {
      setThursdayReminderTime(newTime);
      
      if (thursdayReminderEnabled) {
        // إعادة جدولة تذكير الخميس بالوقت الجديد
        const success = await NotificationService.enableThursdayMassReminder(newTime);
        if (success) {
          Alert.alert('تم التحديث', `تم تحديث وقت تذكير الخميس إلى ${formatTime(newTime)}`);
        }
      }
      
      setShowThursdayTimeModal(false);
    } catch (error) {
      console.error('خطأ في تحديث وقت تذكير الخميس:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحديث وقت تذكير الخميس');
    }
  };

  const handleSendTestNotification = async () => {
    try {
      const success = await NotificationService.sendInstantVerseNotification();
      if (success) {
        Alert.alert('تم الإرسال', 'تم إرسال إشعار تجريبي بآية من الكتاب المقدس');
      } else {
        Alert.alert('فشل', 'لم يتم إرسال الإشعار التجريبي');
      }
    } catch (error) {
      console.error('خطأ في إرسال الإشعار التجريبي:', error);
      Alert.alert('خطأ', 'حدث خطأ في إرسال الإشعار');
    }
  };

  const handleSendMassReminder = async () => {
    try {
      const success = await NotificationService.sendInstantMassReminder();
      if (success) {
        Alert.alert('تم الإرسال', 'تم إرسال تذكير القداس للخدام');
      } else {
        Alert.alert('فشل', 'لم يتم إرسال تذكير القداس');
      }
    } catch (error) {
      console.error('خطأ في إرسال تذكير القداس:', error);
      Alert.alert('خطأ', 'حدث خطأ في إرسال تذكير القداس');
    }
  };

  const handleAddCustomVerse = async () => {
    if (!newVerseForm.verse.trim() || !newVerseForm.reference.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال نص الآية والمرجع');
      return;
    }

    try {
      const success = await NotificationService.addCustomVerse(
        newVerseForm.verse.trim(),
        newVerseForm.reference.trim()
      );

      if (success) {
        Alert.alert('تم الإضافة', 'تم إضافة الآية المخصصة بنجاح');
        setNewVerseForm({ verse: '', reference: '' });
        setShowAddVerseModal(false);
        
        // إعادة تحميل الآيات المخصصة
        const updatedCustomVerses = await NotificationService.getCustomVerses();
        setCustomVerses(updatedCustomVerses);
      } else {
        Alert.alert('فشل', 'لم يتم إضافة الآية');
      }
    } catch (error) {
      console.error('خطأ في إضافة آية مخصصة:', error);
      Alert.alert('خطأ', 'حدث خطأ في إضافة الآية');
    }
  };

  const formatTime = (time) => {
    const hour = time.hour.toString().padStart(2, '0');
    const minute = time.minute.toString().padStart(2, '0');
    return `${hour}:${minute}`;
  };

  const showDailyVerse = () => {
    const verse = NotificationService.getDailyVerseByDate();
    setSelectedVerse(verse);
    setShowVerseModal(true);
  };

  const TimePickerModal = () => (
    <Modal visible={showTimeModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>اختر وقت الإشعار</Text>
          
          <View style={styles.timePickerContainer}>
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>الساعة:</Text>
              <TextInput
                style={styles.timeTextInput}
                value={notificationTime.hour.toString()}
                onChangeText={(text) => {
                  const hour = parseInt(text) || 0;
                  if (hour >= 0 && hour <= 23) {
                    setNotificationTime({ ...notificationTime, hour });
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>الدقيقة:</Text>
              <TextInput
                style={styles.timeTextInput}
                value={notificationTime.minute.toString()}
                onChangeText={(text) => {
                  const minute = parseInt(text) || 0;
                  if (minute >= 0 && minute <= 59) {
                    setNotificationTime({ ...notificationTime, minute });
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowTimeModal(false)}
            >
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => handleTimeChange(notificationTime)}
            >
              <Text style={styles.saveButtonText}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const ThursdayTimeModal = () => (
    <Modal visible={showThursdayTimeModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>وقت تذكير الخميس</Text>
          
          <View style={styles.timePickerContainer}>
            <View style={styles.timePicker}>
              <Text style={styles.timeLabel}>الساعة</Text>
              <TextInput
                style={styles.timeInput}
                value={thursdayReminderTime.hour.toString().padStart(2, '0')}
                onChangeText={(text) => {
                  const hour = parseInt(text) || 0;
                  if (hour >= 0 && hour <= 23) {
                    setThursdayReminderTime({...thursdayReminderTime, hour});
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            
            <Text style={styles.timeSeparator}>:</Text>
            
            <View style={styles.timePicker}>
              <Text style={styles.timeLabel}>الدقيقة</Text>
              <TextInput
                style={styles.timeInput}
                value={thursdayReminderTime.minute.toString().padStart(2, '0')}
                onChangeText={(text) => {
                  const minute = parseInt(text) || 0;
                  if (minute >= 0 && minute <= 59) {
                    setThursdayReminderTime({...thursdayReminderTime, minute});
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowThursdayTimeModal(false)}
            >
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => handleThursdayTimeChange(thursdayReminderTime)}
            >
              <Text style={styles.saveButtonText}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const VerseModal = () => (
    <Modal visible={showVerseModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.verseModalContainer}>
          <Text style={styles.verseModalTitle}>آية اليوم</Text>
          
          {selectedVerse && (
            <View style={styles.verseContent}>
              <Text style={styles.verseText}>"{selectedVerse.verse}"</Text>
              <Text style={styles.verseReference}>- {selectedVerse.reference}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.closeVerseButton}
            onPress={() => setShowVerseModal(false)}
          >
            <Text style={styles.closeVerseButtonText}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const AddVerseModal = () => (
    <Modal visible={showAddVerseModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>إضافة آية مخصصة</Text>
          
          <TextInput
            style={[styles.textInput, styles.verseInput]}
            placeholder="نص الآية..."
            value={newVerseForm.verse}
            onChangeText={(text) => setNewVerseForm({ ...newVerseForm, verse: text })}
            multiline
            textAlign="right"
          />
          
          <TextInput
            style={styles.textInput}
            placeholder="المرجع (مثل: متى ٥: ٣)"
            value={newVerseForm.reference}
            onChangeText={(text) => setNewVerseForm({ ...newVerseForm, reference: text })}
            textAlign="right"
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowAddVerseModal(false);
                setNewVerseForm({ verse: '', reference: '' });
              }}
            >
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleAddCustomVerse}
            >
              <Text style={styles.saveButtonText}>إضافة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>جاري تحميل إعدادات الإشعارات...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕ إغلاق</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إدارة الإشعارات</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* قسم الإعدادات الأساسية */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الإعدادات الأساسية</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>تفعيل الإشعارات اليومية</Text>
                <Text style={styles.settingDescription}>
                  احصل على آية من الكتاب المقدس يومياً
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={notificationsEnabled ? '#3498db' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity
              style={[styles.settingItem, !notificationsEnabled && styles.disabledSetting]}
              onPress={() => notificationsEnabled && setShowTimeModal(true)}
              disabled={!notificationsEnabled}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, !notificationsEnabled && styles.disabledText]}>
                  وقت الإشعار
                </Text>
                <Text style={[styles.settingDescription, !notificationsEnabled && styles.disabledText]}>
                  {formatTime(notificationTime)}
                </Text>
              </View>
              <Text style={[styles.settingArrow, !notificationsEnabled && styles.disabledText]}>
                ◀
              </Text>
            </TouchableOpacity>
          </View>

          {/* إعدادات تذكير الخميس للخدام */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تذكير الخدام - القداس</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>تذكير الخميس للخدام</Text>
                <Text style={styles.settingDescription}>
                  تذكير كل خميس بحضور القداس بدري يوم الجمعة
                </Text>
              </View>
              <Switch
                value={thursdayReminderEnabled}
                onValueChange={handleToggleThursdayReminder}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={thursdayReminderEnabled ? '#3498db' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity
              style={[styles.settingItem, !thursdayReminderEnabled && styles.disabledSetting]}
              onPress={() => thursdayReminderEnabled && setShowThursdayTimeModal(true)}
              disabled={!thursdayReminderEnabled}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, !thursdayReminderEnabled && styles.disabledText]}>
                  وقت تذكير الخميس
                </Text>
                <Text style={[styles.settingDescription, !thursdayReminderEnabled && styles.disabledText]}>
                  {formatTime(thursdayReminderTime)}
                </Text>
              </View>
              <Text style={[styles.settingArrow, !thursdayReminderEnabled && styles.disabledText]}>
                ◀
              </Text>
            </TouchableOpacity>
          </View>

          {/* قسم الآية اليومية */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>آية اليوم</Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={showDailyVerse}>
              <Text style={styles.actionButtonText}>📖 عرض آية اليوم</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleSendTestNotification}>
              <Text style={styles.actionButtonText}>🔔 إرسال إشعار تجريبي</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleSendMassReminder}>
              <Text style={styles.actionButtonText}>⛪ إرسال تذكير القداس للخدام</Text>
            </TouchableOpacity>
          </View>

          {/* قسم الإحصائيات */}
          {stats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الإحصائيات</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.totalBuiltinVerses}</Text>
                  <Text style={styles.statLabel}>آيات مدمجة</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.customVersesCount}</Text>
                  <Text style={styles.statLabel}>آيات مخصصة</Text>
                </View>
              </View>
            </View>
          )}

          {/* قسم الآيات المخصصة (للمدراء فقط) */}
          {user?.role === 'admin' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>إدارة الآيات المخصصة</Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowAddVerseModal(true)}
              >
                <Text style={styles.actionButtonText}>➕ إضافة آية مخصصة</Text>
              </TouchableOpacity>

              {customVerses.length > 0 && (
                <View style={styles.customVersesList}>
                  <Text style={styles.customVersesTitle}>الآيات المخصصة ({customVerses.length})</Text>
                  {customVerses.slice(0, 3).map((verse, index) => (
                    <View key={index} style={styles.customVerseItem}>
                      <Text style={styles.customVerseText} numberOfLines={2}>
                        "{verse.verse}"
                      </Text>
                      <Text style={styles.customVerseReference}>- {verse.reference}</Text>
                    </View>
                  ))}
                  {customVerses.length > 3 && (
                    <Text style={styles.moreVersesText}>
                      وعدد {customVerses.length - 3} آيات أخرى...
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* قسم معلومات إضافية */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>معلومات</Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>📚 عن الإشعارات</Text>
              <Text style={styles.infoText}>
                تساعدك الإشعارات اليومية على التأمل في كلمة الله كل يوم. 
                يتم اختيار آية مختلفة يومياً من مجموعة منتقاة من الآيات الكتابية المباركة.
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>🔔 الأذونات</Text>
              <Text style={styles.infoText}>
                تحتاج إلى منح إذن الإشعارات لتتمكن من استلام الآيات اليومية. 
                يمكنك تغيير هذا الإذن من إعدادات الجهاز في أي وقت.
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>⛪ تذكير الخدام</Text>
              <Text style={styles.infoText}>
                تذكير خاص للخدام يأتي كل يوم خميس لتذكيرهم بحضور القداس بدري يوم الجمعة 
                وتكون قدوة حسنة لأولادهم في الخدمة.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* النوافذ المنبثقة */}
        <TimePickerModal />
        <ThursdayTimeModal />
        <VerseModal />
        {user?.role === 'admin' && <AddVerseModal />}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'right',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'right',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  settingArrow: {
    fontSize: 16,
    color: '#bdc3c7',
    marginLeft: 10,
  },
  disabledSetting: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#bdc3c7',
  },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minWidth: 100,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  customVersesList: {
    marginTop: 15,
  },
  customVersesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'right',
  },
  customVerseItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderRightWidth: 3,
    borderRightColor: '#3498db',
  },
  customVerseText: {
    fontSize: 14,
    color: '#2c3e50',
    textAlign: 'right',
    marginBottom: 4,
  },
  customVerseReference: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'right',
    fontStyle: 'italic',
  },
  moreVersesText: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderRightWidth: 4,
    borderRightColor: '#3498db',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  infoText: {
    fontSize: 13,
    color: '#7f8c8d',
    lineHeight: 20,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  verseModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    width: '90%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  verseModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 20,
  },
  verseContent: {
    alignItems: 'center',
    marginBottom: 30,
  },
  verseText: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  verseReference: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  closeVerseButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  closeVerseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  timeInput: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  timeTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    width: 60,
    backgroundColor: '#f8f9fa',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 15,
  },
  verseInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationManagementScreen;
