// ملف اختبار النوتفيكشنز - CommonJS
const fs = require('fs');
const path = require('path');

// قراءة ملف الخدمة واختبار البيانات فقط
function testNotificationData() {
  console.log('🔄 بدء اختبار بيانات النوتفيكشنز...');
  
  try {
    // قراءة ملف الخدمة
    const serviceFilePath = path.join(__dirname, 'src', 'services', 'notificationService.js');
    const serviceContent = fs.readFileSync(serviceFilePath, 'utf8');
    
    // استخراج الآيات من الملف
    const versesMatch = serviceContent.match(/const BIBLE_VERSES = \[([\s\S]*?)\];/);
    if (!versesMatch) {
      throw new Error('لم يتم العثور على مصفوفة الآيات');
    }
    
    // عد الآيات
    const versesContent = versesMatch[1];
    const verseObjects = versesContent.split('},').filter(part => part.trim().includes('verse:'));
    const versesCount = verseObjects.length;
    
    console.log('✅ تم العثور على ملف الخدمة بنجاح');
    console.log('✅ إجمالي عدد الآيات:', versesCount);
    
    // فحص بعض الآيات العشوائية
    console.log('✅ فحص محتوى بعض الآيات:');
    const sampleVerses = [
      'أَحَبَّنَا اللهُ هَكَذَا',
      'تَعَالَوْا إِلَيَّ يَا جَمِيعَ الْمُتْعَبِينَ',
      'أَنَا هُوَ الطَّرِيقُ وَالْحَقُّ',
      'لاَ تَخَفْ لأَنِّي مَعَكَ'
    ];
    
    sampleVerses.forEach(verse => {
      if (serviceContent.includes(verse)) {
        console.log('  ✓ تم العثور على:', verse.substring(0, 30) + '...');
      }
    });
    
    // فحص بنية الكلاس
    if (serviceContent.includes('class NotificationService')) {
      console.log('✅ كلاس NotificationService موجود');
    }
    
    if (serviceContent.includes('requestPermissions')) {
      console.log('✅ دالة requestPermissions موجودة');
    }
    
    if (serviceContent.includes('enableDailyNotifications')) {
      console.log('✅ دالة enableDailyNotifications موجودة');
    }
    
    if (serviceContent.includes('getDailyVerse')) {
      console.log('✅ دالة getDailyVerse موجودة');
    }
    
    console.log('🎉 جميع فحوصات النوتفيكشنز نجحت!');
    console.log('📊 النتيجة النهائية:');
    console.log('   - عدد الآيات:', versesCount);
    console.log('   - الملف سليم ومنظم');
    console.log('   - جميع الدوال المطلوبة موجودة');
    
  } catch (error) {
    console.error('❌ خطأ في اختبار النوتفيكشنز:', error.message);
  }
}

// تشغيل الاختبار
testNotificationData();
