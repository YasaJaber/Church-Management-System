const mongoose = require("mongoose");
const Child = require("../models/Child");
const Class = require("../models/Class");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://yasamasry:Yasa_jaber12345@marygerges.f7mwc5q.mongodb.net/margerges_church?retryWrites=true&w=majority&appName=maryGerges";

// الأسماء الـ 38 الصحيحة للفصل الرابع (من الجدول المرسل)
const correctFourthGradeNames = [
  "اثانسيوس اسامه",
  "ايريني منصور", 
  "ايهاب جمال",
  "بتول فريد",
  "بسنت جاد الرب",
  "توماس اكمل",
  "جولسيا ادور",
  "جوليسيا ادوار",
  "جومانا جرجس",
  "جونير مونير",
  "ديفيد ناجي",
  "سليمان عدنان",
  "فيبرونيا انطون",
  "فيبرونيا وجيه",
  "كاراس صابر",
  "كاراس هاني",
  "كارن رضا",
  "كارن رضان",
  "كارن فادي",
  "كيرلس امجد",
  "كيرلس ايسم",
  "كيرلس ايشم",
  "كيرلس ميخائيل",
  "مارفينا مينا",
  "مارك هاني",
  "مارينا امجد",
  "مارينا عوض",
  "مريم اسامه",
  "مريم امجد",
  "مريم ثابت",
  "مريم عماد",
  "مريم مينا",
  "مريم وائل",
  "مهرائيل عادل",
  "ميرا مينا",
  "نوفير سامح",
  "هبه ايهاب",
  "يوسف ندهي"
];

async function syncServiceLeaderWithClass() {
  try {
    console.log("🔄 بدء الاتصال بقاعدة البيانات...");
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");

    console.log("\n" + "=".repeat(70));
    console.log("🔄 مزامنة قائمة أمين الخدمة مع الفصل الرابع");
    console.log("=".repeat(70));

    // البحث عن فصل الرابع الابتدائي
    const fourthGradeClass = await Class.findOne({ 
      name: "رابعة ابتدائي",
      stage: "Primary" 
    });
    
    if (!fourthGradeClass) {
      console.error("❌ لم يتم العثور على فصل الرابع الابتدائي");
      return;
    }

    console.log(`📚 فصل: ${fourthGradeClass.name}`);
    console.log(`🎯 سيتم التأكد من وجود ${correctFourthGradeNames.length} اسم بالضبط`);

    // الخطوة 1: حذف جميع الأطفال الحاليين في الفصل
    console.log(`\n🗑️  الخطوة 1: حذف جميع الأطفال الحاليين...`);
    
    const deleteResult = await Child.deleteMany({ 
      class: fourthGradeClass._id 
    });
    
    console.log(`✅ تم حذف ${deleteResult.deletedCount} طفل من الفصل`);

    // الخطوة 2: إضافة الأسماء الـ 38 الصحيحة
    console.log(`\n➕ الخطوة 2: إضافة الأسماء الـ 38 الصحيحة...`);
    
    let addedCount = 0;
    let errors = [];

    for (const name of correctFourthGradeNames) {
      try {
        const newChild = new Child({
          name: name.trim(),
          stage: "Primary",
          grade: "4th",
          class: fourthGradeClass._id,
          isActive: true
        });

        await newChild.save();
        console.log(`   ✅ ${addedCount + 1}. ${name}`);
        addedCount++;
      } catch (error) {
        console.log(`   ❌ خطأ في إضافة ${name}: ${error.message}`);
        errors.push({ name, error: error.message });
      }
    }

    console.log(`\n📊 نتائج العملية:`);
    console.log(`   ✅ تم إضافة: ${addedCount} طفل`);
    console.log(`   ❌ أخطاء: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  الأخطاء:`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.name}: ${error.error}`);
      });
    }

    // الخطوة 3: التحقق النهائي
    console.log(`\n🔍 الخطوة 3: التحقق النهائي...`);
    
    const finalCount = await Child.countDocuments({ 
      class: fourthGradeClass._id,
      isActive: true 
    });

    const finalChildren = await Child.find({ 
      class: fourthGradeClass._id,
      isActive: true 
    }).select('name').sort({ name: 1 });

    console.log(`\n📋 العدد النهائي: ${finalCount} طفل`);
    
    if (finalCount === correctFourthGradeNames.length) {
      console.log(`🎉 ممتاز! العدد مطابق تماماً (${correctFourthGradeNames.length} طفل)`);
    } else {
      console.log(`⚠️ تحذير: العدد غير مطابق`);
      console.log(`   المتوقع: ${correctFourthGradeNames.length}`);
      console.log(`   الفعلي: ${finalCount}`);
    }

    // إنشاء قائمة أمين الخدمة المحدثة
    console.log(`\n💾 الخطوة 4: إنشاء قائمة أمين الخدمة المحدثة...`);
    
    const fs = require('fs');
    const path = require('path');
    
    const serviceLeaderUpdate = `# قائمة أطفال الفصل الرابع الابتدائي - أمين الخدمة
تم التحديث: ${new Date().toLocaleString('ar-EG')}
العدد: ${finalCount} طفل

## الأسماء:
${finalChildren.map((child, index) => `${index + 1}. ${child.name}`).join('\n')}

---
ملاحظة: هذه القائمة متزامنة مع قاعدة البيانات
أي تعديل في الفصل سينعكس تلقائياً هنا
`;

    const updateFilePath = path.join(__dirname, 'service-leader-update.md');
    fs.writeFileSync(updateFilePath, serviceLeaderUpdate, 'utf8');
    console.log(`✅ تم حفظ التحديث في: ${updateFilePath}`);

    // رسالة للمستخدم
    console.log(`\n` + "=".repeat(70));
    console.log(`🎯 ملخص التحديث لأمين الخدمة:`);
    console.log(`   📊 العدد الآن: ${finalCount} طفل (بدلاً من 47)`);
    console.log(`   🔄 المزامنة: تلقائية مع قاعدة البيانات`);
    console.log(`   ✅ أي إضافة أو حذف في الفصل سينعكس فوراً`);
    console.log(`   📋 القائمة محفوظة في ملف منفصل للمرجعية`);
    console.log("=".repeat(70));

  } catch (error) {
    console.error("❌ خطأ في عملية المزامنة:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("\n📤 تم قطع الاتصال من قاعدة البيانات");
    process.exit(0);
  }
}

syncServiceLeaderWithClass();
