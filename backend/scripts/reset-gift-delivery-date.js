const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/church-management';

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// التنسيق: 'YYYY-MM-DDTHH:mm:ss+02:00'
// مثال: '2026-02-27T12:00:00+02:00' = 27 فبراير 2026 الساعة 12 ظهراً
// ═══════════════════════════════════════════════════════════════════════════════
const RESET_DATE = new Date('2026-02-27T12:00:00+02:00');
// ═══════════════════════════════════════════════════════════════════════════════

async function resetGiftDeliveryDate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // الحصول على كل الفصول
    const allClasses = await db.collection('classes').find({ isActive: true }).toArray();
    console.log(`📚 عدد الفصول النشطة: ${allClasses.length}\n`);
    
    // الحصول على مستخدم للتسليم (سيتم استخدام أول مستخدم admin أو service leader)
    const deliveredByUser = await db.collection('users').findOne({
      role: { $in: ['admin', 'service_leader'] }
    });
    
    if (!deliveredByUser) {
      console.error('❌ لم يتم العثور على مستخدم admin أو service_leader لتسجيل عملية التسليم');
      return;
    }
    
    console.log(`👤 سيتم تسجيل الريسيت باسم: ${deliveredByUser.name}\n`);
    console.log('═'.repeat(80));
    console.log(`📅 تاريخ الريسيت: ${RESET_DATE.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`);
    console.log('═'.repeat(80));
    console.log('');
    
    let totalChildrenProcessed = 0;
    let totalServantsProcessed = 0;
    const giftRecordsToInsert = [];
    
    // معالجة كل فصل
    for (const classDoc of allClasses) {
      console.log(`\n🔄 معالجة فصل: ${classDoc.name}...`);
      
      // الحصول على كل الأطفال في الفصل
      const children = await db.collection('children').find({
        class: classDoc._id,
        isActive: true
      }).toArray();
      
      console.log(`   👶 عدد الأطفال: ${children.length}`);
      
      // إنشاء سجلات ريسيت للأطفال
      for (const child of children) {
        // التحقق من عدم وجود سجل ريسيت بنفس التاريخ
        const existingReset = await db.collection('giftdeliveries').findOne({
          child: child._id,
          deliveryDate: RESET_DATE,
          giftType: "إعادة تعيين عداد المواظبة"
        });
        
        if (!existingReset) {
          giftRecordsToInsert.push({
            child: child._id,
            deliveredBy: deliveredByUser._id,
            deliveryDate: RESET_DATE,
            consecutiveWeeksEarned: 0,
            giftType: "إعادة تعيين عداد المواظبة",
            notes: "ريسيت تلقائي لتاريخ 27/2/2026 - الجمعة اللي قبل 6/3/2026",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          totalChildrenProcessed++;
        }
      }
      
      // الحصول على كل الخدام في الفصل
      if (classDoc.servants && classDoc.servants.length > 0) {
        const servants = await db.collection('users').find({
          _id: { $in: classDoc.servants },
          isActive: true
        }).toArray();
        
        console.log(`   👨‍🏫 عدد الخدام: ${servants.length}`);
        
        // إنشاء سجلات ريسيت للخدام
        for (const servant of servants) {
          // التحقق من عدم وجود سجل ريسيت بنفس التاريخ
          const existingReset = await db.collection('giftdeliveries').findOne({
            servant: servant._id,
            deliveryDate: RESET_DATE,
            giftType: "إعادة تعيين عداد المواظبة"
          });
          
          if (!existingReset) {
            giftRecordsToInsert.push({
              servant: servant._id,
              deliveredBy: deliveredByUser._id,
              deliveryDate: RESET_DATE,
              consecutiveWeeksEarned: 0,
              giftType: "إعادة تعيين عداد المواظبة",
              notes: "ريسيت تلقائي لتاريخ 27/2/2026 - الجمعة اللي قبل 6/3/2026",
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            totalServantsProcessed++;
          }
        }
      }
      
      console.log(`   ✅ تمت معالجة فصل: ${classDoc.name}`);
    }
    
    // إدراج كل السجلات دفعة واحدة
    if (giftRecordsToInsert.length > 0) {
      console.log('\n═'.repeat(80));
      console.log(`\n💾 جاري إدراج ${giftRecordsToInsert.length} سجل ريسيت...`);
      
      const result = await db.collection('giftdeliveries').insertMany(giftRecordsToInsert);
      
      console.log(`✅ تم إدراج ${result.insertedCount} سجل بنجاح`);
      console.log('\n═'.repeat(80));
      console.log('\n📊 ملخص العملية:');
      console.log(`   👶 عدد الأطفال: ${totalChildrenProcessed}`);
      console.log(`   👨‍🏫 عدد الخدام: ${totalServantsProcessed}`);
      console.log(`   📝 إجمالي السجلات: ${giftRecordsToInsert.length}`);
      console.log('═'.repeat(80));
    } else {
      console.log('\n⚠️  لم يتم العثور على سجلات جديدة للإدراج (ربما تم عمل الريسيت مسبقاً)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// تشغيل السكريبت
resetGiftDeliveryDate();
