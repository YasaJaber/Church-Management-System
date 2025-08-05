const mongoose = require("mongoose");
const Child = require("../models/Child");
const Class = require("../models/Class");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://yasamasry:Yasa_jaber12345@marygerges.f7mwc5q.mongodb.net/margerges_church?retryWrites=true&w=majority&appName=maryGerges";

// سيتم تحديث هذه القائمة تلقائياً من قاعدة البيانات
// لأن أسماء الفصل صحيحة ونريد مطابقة أمين الخدمة معها
let serviceLeaderFourthGradeChildren = [
  // سيتم ملء هذه القائمة من قاعدة البيانات
];

async function matchAndFixChildrenData() {
  try {
    console.log("🔄 بدء الاتصال بقاعدة البيانات...");
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");

    console.log("\n" + "=".repeat(60));
    console.log("📊 تحليل بيانات الأطفال وتطابق الفصول");
    console.log("=".repeat(60));

    // 1. التحقق من الصف الرابع الابتدائي
    console.log("\n🔍 الخطوة 1: التحقق من أطفال الصف الرابع الابتدائي");
    console.log("-".repeat(50));

    const fourthGradeClass = await Class.findOne({ 
      name: "رابعة ابتدائي",
      stage: "Primary" 
    });
    
    if (!fourthGradeClass) {
      console.error("❌ لم يتم العثور على فصل الرابع الابتدائي");
      return;
    }

    // الحصول على أطفال الصف الرابع من قاعدة البيانات
    const fourthGradeChildrenInDB = await Child.find({ 
      class: fourthGradeClass._id,
      isActive: true 
    }).select('name');

    const dbNames = fourthGradeChildrenInDB.map(child => child.name.trim());
    
    // تحديث قائمة أمين الخدمة لتطابق أسماء الفصل (لأن الفصل صحيح)
    serviceLeaderFourthGradeChildren = [...dbNames];
    const serviceLeaderNames = [...dbNames]; // نفس الأسماء

    console.log(`📚 فصل: ${fourthGradeClass.name}`);
    console.log(`👤 عدد الأطفال في قاعدة البيانات (المرجع الصحيح): ${dbNames.length}`);
    console.log(`👤 عدد الأطفال عند أمين الخدمة (سيتم التحديث): ${serviceLeaderNames.length}`);

    // مقارنة الأسماء - الآن سيكونان متطابقان
    const missingInDB = serviceLeaderNames.filter(name => !dbNames.includes(name));
    const extraInDB = dbNames.filter(name => !serviceLeaderNames.includes(name));
    const matchingNames = dbNames.filter(name => serviceLeaderNames.includes(name));

    console.log(`\n📋 نتائج المقارنة:`);
    console.log(`✅ أسماء متطابقة: ${matchingNames.length}`);
    console.log(`❌ أسماء مفقودة في قاعدة البيانات: ${missingInDB.length}`);
    console.log(`⚠️  أسماء زائدة في قاعدة البيانات: ${extraInDB.length}`);
    console.log(`\n🎯 تم تحديث قائمة أمين الخدمة لتطابق أسماء الفصل (${dbNames.length} اسم)`);

    // عرض القائمة المحدثة
    console.log(`\n� قائمة أمين الخدمة المحدثة (${serviceLeaderNames.length} اسم):`);
    serviceLeaderNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });

    // لا حاجة لإضافة أسماء لأنها ستكون متطابقة
    console.log(`\n✅ لا حاجة لإضافة أي أسماء - التطابق مكتمل!`);

    // 2. حذف حقل العمر (age) من جميع الأطفال
    console.log("\n🔄 الخطوة 2: حذف حقل العمر من جميع الأطفال");
    console.log("-".repeat(50));

    try {
      const updateResult = await Child.updateMany(
        { age: { $exists: true } }, // البحث عن المستندات التي تحتوي على حقل age
        { $unset: { age: "" } } // حذف حقل age
      );
      
      console.log(`✅ تم حذف حقل العمر من ${updateResult.modifiedCount} طفل`);
    } catch (error) {
      console.log(`❌ خطأ في حذف حقل العمر: ${error.message}`);
    }

    // 3. التحقق من تطابق جميع الفصول
    console.log("\n🔄 الخطوة 3: التحقق من إحصائيات جميع الفصول");
    console.log("-".repeat(50));

    const allClasses = await Class.find({ isActive: true }).sort({ stage: 1, grade: 1 });
    let totalChildren = 0;

    console.log(`\n📊 ملخص الأطفال حسب الفصل:`);
    for (const cls of allClasses) {
      const childrenCount = await Child.countDocuments({ 
        class: cls._id, 
        isActive: true 
      });
      totalChildren += childrenCount;
      
      console.log(`   📚 ${cls.name} (${cls.stage} - ${cls.grade}): ${childrenCount} طفل`);
    }

    console.log(`\n🎯 إجمالي الأطفال في جميع الفصول: ${totalChildren} طفل`);

    // 4. التحقق النهائي من الصف الرابع بعد التحديث
    console.log("\n🔄 الخطوة 4: التحقق النهائي من الصف الرابع");
    console.log("-".repeat(50));

    const updatedFourthGradeChildren = await Child.find({ 
      class: fourthGradeClass._id,
      isActive: true 
    }).select('name').sort({ name: 1 });

    console.log(`\n✅ العدد النهائي لأطفال الصف الرابع: ${updatedFourthGradeChildren.length}`);
    console.log(`📋 قائمة الأطفال النهائية:`);
    updatedFourthGradeChildren.forEach((child, index) => {
      console.log(`   ${index + 1}. ${child.name}`);
    });

    // التحقق من التطابق النهائي
    const finalDBNames = updatedFourthGradeChildren.map(child => child.name.trim());
    const finalMissingInDB = serviceLeaderNames.filter(name => !finalDBNames.includes(name));
    
    if (finalMissingInDB.length === 0) {
      console.log(`\n🎉 تم! جميع أطفال الصف الرابع متطابقون مع قائمة أمين الخدمة المحدثة`);
      console.log(`📊 العدد النهائي: ${finalDBNames.length} طفل في كلا القائمتين`);
    } else {
      console.log(`\n⚠️  خطأ: لا يزال هناك ${finalMissingInDB.length} أطفال مفقودين`);
    }

    // إنشاء ملف بقائمة أمين الخدمة المحدثة
    console.log(`\n🔄 الخطوة 5: حفظ قائمة أمين الخدمة المحدثة`);
    console.log("-".repeat(50));

    const fs = require('fs');
    const path = require('path');
    
    const serviceLeaderList = `// قائمة أطفال الصف الرابع الابتدائي المحدثة لأمين الخدمة
// تم تحديثها من قاعدة البيانات بتاريخ: ${new Date().toLocaleDateString('ar-EG')}
// العدد: ${serviceLeaderNames.length} طفل

const fourthGradeServiceLeaderList = [
${serviceLeaderNames.map(name => `  "${name}"`).join(',\n')}
];

module.exports = fourthGradeServiceLeaderList;
`;

    const filePath = path.join(__dirname, 'fourth-grade-service-leader-list.js');
    fs.writeFileSync(filePath, serviceLeaderList, 'utf8');
    console.log(`✅ تم حفظ قائمة أمين الخدمة المحدثة في: ${filePath}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ تم الانتهاء من عملية المطابقة والتحديث");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ خطأ في عملية المطابقة:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("\n📤 تم قطع الاتصال من قاعدة البيانات");
    process.exit(0);
  }
}

matchAndFixChildrenData();
