const mongoose = require("mongoose");
const Class = require("../models/Class");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://yasamasry:Yasa_jaber12345@marygerges.f7mwc5q.mongodb.net/margerges_church?retryWrites=true&w=majority&appName=maryGerges";

async function listAllClasses() {
  try {
    console.log("🔄 بدء الاتصال بقاعدة البيانات...");
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");

    console.log("\n📚 جميع الفصول الموجودة في قاعدة البيانات:");
    console.log("=".repeat(60));

    const allClasses = await Class.find().sort({ stage: 1, grade: 1 });
    
    allClasses.forEach((cls, index) => {
      console.log(`${index + 1}. اسم الفصل: "${cls.name}"`);
      console.log(`   المرحلة: "${cls.stage}"`);
      console.log(`   الصف: "${cls.grade}"`);
      console.log(`   نشط: ${cls.isActive}`);
      console.log(`   ID: ${cls._id}`);
      console.log("-".repeat(40));
    });

    console.log(`\n🎯 إجمالي الفصول: ${allClasses.length} فصل`);

  } catch (error) {
    console.error("❌ خطأ في استرجاع الفصول:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("\n📤 تم قطع الاتصال من قاعدة البيانات");
    process.exit(0);
  }
}

listAllClasses();
