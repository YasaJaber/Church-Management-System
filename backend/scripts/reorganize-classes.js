const mongoose = require("mongoose");
const Child = require("../models/Child");
const Class = require("../models/Class");
const User = require("../models/User");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://yasamasry:Yasa_jaber12345@marygerges.f7mwc5q.mongodb.net/margerges_church?retryWrites=true&w=majority&appName=maryGerges";

async function reorganizeClassesAndChildren() {
  try {
    console.log("🔄 بدء الاتصال بقاعدة البيانات...");
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");

    // First, let's create proper class structure
    console.log('\n🏗️  إنشاء هيكل الفصول الجديد...');
    
    // Clear existing classes except Nursery, Preparatory, Secondary
    await Class.deleteMany({ stage: 'Primary' });
    console.log('✅ تم حذف الفصول الابتدائية المكررة');
    
    // Create individual primary classes with proper schema
    const primaryClasses = [
      { stage: 'Primary', grade: '1st', name: 'أولى ابتدائي', order: 1 },
      { stage: 'Primary', grade: '2nd', name: 'ثانية ابتدائي', order: 2 },
      { stage: 'Primary', grade: '3rd', name: 'ثالثة ابتدائي', order: 3 },
      { stage: 'Primary', grade: '4th', name: 'رابعة ابتدائي', order: 4 },
      { stage: 'Primary', grade: '5th', name: 'خامسة ابتدائي', order: 5 },
      { stage: 'Primary', grade: '6th', name: 'سادسة ابتدائي', order: 6 }
    ];
    
    const createdClasses = {};
    
    for (const classData of primaryClasses) {
      const newClass = new Class(classData);
      await newClass.save();
      createdClasses[classData.name] = newClass;
      console.log(`✅ تم إنشاء فصل: ${classData.name}`);
    }
    
    // Get existing Nursery, Preparatory, Secondary classes
    const nurseryClass = await Class.findOne({ stage: 'Nursery' });
    const prepClass = await Class.findOne({ stage: 'Preparatory' });
    const secondaryClass = await Class.findOne({ stage: 'Secondary' });
    
    if (nurseryClass) {
      createdClasses['حضانة'] = nurseryClass;
      // Update name if needed
      if (!nurseryClass.name) {
        nurseryClass.name = 'حضانة';
        nurseryClass.grade = 'KG';
        await nurseryClass.save();
      }
    }
    if (prepClass) {
      createdClasses['إعدادي'] = prepClass;
      if (!prepClass.name) {
        prepClass.name = 'إعدادي';
        prepClass.grade = 'Prep';
        await prepClass.save();
      }
    }
    if (secondaryClass) {
      createdClasses['ثانوي'] = secondaryClass;
      if (!secondaryClass.name) {
        secondaryClass.name = 'ثانوي';
        secondaryClass.grade = 'Sec';
        await secondaryClass.save();
      }
    }
    
    console.log('\n👶 إعادة توزيع الأطفال على الفصول...');
    
    // Get all children
    const allChildren = await Child.find();
    console.log(`📊 إجمالي الأطفال: ${allChildren.length}`);
    
    // Redistribute children more evenly
    const childrenPerClass = Math.floor(allChildren.length / Object.keys(createdClasses).length);
    console.log(`📋 تقسيم الأطفال: ~${childrenPerClass} طفل لكل فصل`);
    
    let childIndex = 0;
    const classKeys = Object.keys(createdClasses);
    
    for (let i = 0; i < classKeys.length; i++) {
      const className = classKeys[i];
      const classObj = createdClasses[className];
      
      // Calculate how many children for this class
      let childrenForThisClass = childrenPerClass;
      if (i === classKeys.length - 1) {
        // Last class gets remaining children
        childrenForThisClass = allChildren.length - childIndex;
      }
      
      console.log(`\n📚 توزيع ${childrenForThisClass} طفل على فصل ${className}:`);
      
      for (let j = 0; j < childrenForThisClass && childIndex < allChildren.length; j++) {
        const child = allChildren[childIndex];
        child.class = classObj._id;
        await child.save();
        console.log(`   ✅ ${child.name} -> ${className}`);
        childIndex++;
      }
    }
    
    console.log('\n🔧 تحديث اكونتات الفصول...');
    
    // Update class accounts to point to correct classes
    const classAccountMapping = [
      { username: 'hadana', className: 'حضانة' },
      { username: 'oola', className: 'أولى ابتدائي' },
      { username: 'tanya', className: 'ثانية ابتدائي' },
      { username: 'talata', className: 'ثالثة ابتدائي' },
      { username: 'rabaa', className: 'رابعة ابتدائي' },
      { username: 'khamsa', className: 'خامسة ابتدائي' },
      { username: 'sada', className: 'سادسة ابتدائي' },
      { username: 'edady', className: 'إعدادي' },
      { username: 'thanwya', className: 'ثانوي' }
    ];
    
    for (const mapping of classAccountMapping) {
      const user = await User.findOne({ username: mapping.username });
      const classObj = createdClasses[mapping.className];
      
      if (user && classObj) {
        user.assignedClass = classObj._id;
        await user.save();
        console.log(`✅ ${mapping.username} -> ${mapping.className}`);
      } else {
        console.log(`❌ لم يتم العثور على ${mapping.username} أو ${mapping.className}`);
      }
    }
    
    console.log('\n📊 ملخص التوزيع النهائي:');
    for (const [className, classObj] of Object.entries(createdClasses)) {
      const childCount = await Child.countDocuments({ class: classObj._id });
      console.log(`📋 ${className}: ${childCount} طفل`);
    }

  } catch (error) {
    console.error("❌ خطأ:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("\n📤 تم قطع الاتصال من قاعدة البيانات");
    process.exit(0);
  }
}

reorganizeClassesAndChildren();
