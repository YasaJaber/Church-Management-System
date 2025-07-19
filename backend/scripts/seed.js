const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import models
const User = require("../models/User");
const Class = require("../models/Class");
const Child = require("../models/Child");
const Attendance = require("../models/Attendance");

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mar_gerges_attendance";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Helper function to get Friday dates going back N weeks
const getFridayDatesBack = (weeksBack) => {
  const fridays = [];
  const today = new Date();

  for (let i = 0; i < weeksBack; i++) {
    const friday = new Date();
    const dayOfWeek = today.getDay();
    let daysToSubtract;

    if (dayOfWeek === 5) {
      daysToSubtract = i * 7;
    } else if (dayOfWeek > 5) {
      daysToSubtract = dayOfWeek - 5 + i * 7;
    } else {
      daysToSubtract = dayOfWeek + 2 + i * 7;
    }

    friday.setDate(today.getDate() - daysToSubtract);
    fridays.push(friday);
  }

  return fridays;
};

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await User.deleteMany({});
    await Class.deleteMany({});
    await Child.deleteMany({});
    await Attendance.deleteMany({});

    // Create Classes
    console.log("📚 Creating classes...");
    const classes = [
      {
        stage: "Nursery",
        grade: "حضانة",
        name: "حضانة",
        description: "من 3 إلى 5 سنوات",
        order: 1,
      },
      {
        stage: "Primary",
        grade: "الصف الأول",
        name: "الصف الأول الابتدائي",
        description: "من 6 إلى 7 سنوات",
        order: 2,
      },
      {
        stage: "Primary",
        grade: "الصف الثاني",
        name: "الصف الثاني الابتدائي",
        description: "من 7 إلى 8 سنوات",
        order: 3,
      },
      {
        stage: "Primary",
        grade: "الصف الثالث",
        name: "الصف الثالث الابتدائي",
        description: "من 8 إلى 9 سنوات",
        order: 4,
      },
      {
        stage: "Primary",
        grade: "الصف الرابع",
        name: "الصف الرابع الابتدائي",
        description: "من 9 إلى 10 سنوات",
        order: 5,
      },
      {
        stage: "Primary",
        grade: "الصف الخامس",
        name: "الصف الخامس الابتدائي",
        description: "من 10 إلى 11 سنة",
        order: 6,
      },
      {
        stage: "Primary",
        grade: "الصف السادس",
        name: "الصف السادس الابتدائي",
        description: "من 11 إلى 12 سنة",
        order: 7,
      },
      {
        stage: "Preparatory",
        grade: "إعدادي",
        name: "المرحلة الإعدادية",
        description: "من 12 إلى 15 سنة",
        order: 8,
      },
      {
        stage: "Secondary",
        grade: "ثانوي",
        name: "المرحلة الثانوية",
        description: "من 15 إلى 18 سنة",
        order: 9,
      },
    ];

    const createdClasses = await Class.insertMany(classes);
    console.log(`✅ Created ${createdClasses.length} classes`);

    // Create Users (Admin and Servants)
    console.log("👥 Creating users...");

    // Hash passwords for each user
    const kerolesPassword = await bcrypt.hash("keroles123", 12);
    const emadPassword = await bcrypt.hash("emad123", 12);
    const hadanaPassword = await bcrypt.hash("hadana123", 12);
    const oolaPassword = await bcrypt.hash("oola123", 12);
    const tanyaPassword = await bcrypt.hash("tanya123", 12);
    const taltaPassword = await bcrypt.hash("talta123", 12);
    const rabaaPassword = await bcrypt.hash("rabaa123", 12);
    const khamsaPassword = await bcrypt.hash("khamsa123", 12);
    const sataPassword = await bcrypt.hash("sata123", 12);
    const aadadyPassword = await bcrypt.hash("aadady123", 12);
    const thanwyPassword = await bcrypt.hash("thanwy123", 12);

    const users = [
      // أمناء الخدمة
      {
        name: "كيرولس",
        username: "keroles",
        password: kerolesPassword,
        role: "admin",
        phone: "01111111111",
        assignedClass: null,
      },
      {
        name: "عماد",
        username: "emad",
        password: emadPassword,
        role: "admin",
        phone: "01222222222",
        assignedClass: null,
      },

      // خدام الفصول
      {
        name: "خادم الحضانة",
        username: "hadana",
        password: hadanaPassword,
        role: "servant",
        phone: "01333333333",
        assignedClass: createdClasses[0]._id, // حضانة
      },
      {
        name: "خادم الأولى ابتدائي",
        username: "oola",
        password: oolaPassword,
        role: "servant",
        phone: "01444444444",
        assignedClass: createdClasses[1]._id, // الصف الأول
      },
      {
        name: "خادم التانية ابتدائي",
        username: "tanya",
        password: tanyaPassword,
        role: "servant",
        phone: "01555555555",
        assignedClass: createdClasses[2]._id, // الصف الثاني
      },
      {
        name: "خادم التالتة ابتدائي",
        username: "talta",
        password: taltaPassword,
        role: "servant",
        phone: "01666666666",
        assignedClass: createdClasses[3]._id, // الصف الثالث
      },
      {
        name: "خادم الرابعة ابتدائي",
        username: "rabaa",
        password: rabaaPassword,
        role: "servant",
        phone: "01777777777",
        assignedClass: createdClasses[4]._id, // الصف الرابع
      },
      {
        name: "خادم الخامسة ابتدائي",
        username: "khamsa",
        password: khamsaPassword,
        role: "servant",
        phone: "01888888888",
        assignedClass: createdClasses[5]._id, // الصف الخامس
      },
      {
        name: "خادم الساتة ابتدائي",
        username: "sata",
        password: sataPassword,
        role: "servant",
        phone: "01999999999",
        assignedClass: createdClasses[6]._id, // الصف السادس
      },
      {
        name: "خادم الإعدادي",
        username: "aadady",
        password: aadadyPassword,
        role: "servant",
        phone: "01000000000",
        assignedClass: createdClasses[7]._id, // إعدادي
      },
      {
        name: "خادم الثانوي",
        username: "thanwy",
        password: thanwyPassword,
        role: "servant",
        phone: "01123456789",
        assignedClass: createdClasses[8]._id, // ثانوي
      },
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create Children
    console.log("👶 Creating children...");

    const children = [
      // حضانة
      {
        name: "بيتر سمير",
        age: 6,
        phone: "01111222333",
        parentName: "سمير بيتر",
        stage: "Nursery",
        grade: "حضانة",
        class: createdClasses[0]._id,
        notes: "يحتاج لمزيد من الاهتمام",
      },

      // الصف الأول
      {
        name: "يوحنا مينا",
        age: 7,
        phone: "01555555555",
        parentName: "مينا يوحنا",
        stage: "Primary",
        grade: "الصف الأول",
        class: createdClasses[1]._id,
        notes: "طفل نشيط ومتفاعل",
      },
      {
        name: "مريم جورج",
        age: 7,
        phone: "01666666666",
        parentName: "جورج مريم",
        stage: "Primary",
        grade: "الصف الأول",
        class: createdClasses[1]._id,
        notes: "",
      },
      {
        name: "مارك صموئيل",
        age: 8,
        phone: "01777777777",
        parentName: "صموئيل مارك",
        stage: "Primary",
        grade: "الصف الأول",
        class: createdClasses[1]._id,
        notes: "يحب المشاركة في الأنشطة",
      },

      // الصف الثاني
      {
        name: "فيرونيا عادل",
        age: 8,
        phone: "01888888888",
        parentName: "عادل فيرونيا",
        stage: "Primary",
        grade: "الصف الثاني",
        class: createdClasses[2]._id,
        notes: "",
      },
      {
        name: "مايكل رومانى",
        age: 9,
        phone: "01999999999",
        parentName: "رومانى مايكل",
        stage: "Primary",
        grade: "الصف الثاني",
        class: createdClasses[2]._id,
        notes: "موهوب في الرسم",
      },

      // الصف الرابع
      {
        name: "كريستينا مجدي",
        age: 10,
        phone: "01222333444",
        parentName: "مجدي كريستينا",
        stage: "Primary",
        grade: "الصف الرابع",
        class: createdClasses[4]._id,
        notes: "",
      },

      // إعدادي
      {
        name: "نانسي ماهر",
        age: 13,
        phone: "01000000000",
        parentName: "ماهر نانسي",
        stage: "Preparatory",
        grade: "إعدادي",
        class: createdClasses[7]._id,
        notes: "متميزة في الدراسة",
      },
      {
        name: "أندرو عادل",
        age: 12,
        phone: "01333444555",
        parentName: "عادل أندرو",
        stage: "Preparatory",
        grade: "إعدادي",
        class: createdClasses[7]._id,
        notes: "نشيط في الأنشطة الرياضية",
      },
      {
        name: "مارينا صبحي",
        age: 14,
        phone: "01444555666",
        parentName: "صبحي مارينا",
        stage: "Preparatory",
        grade: "إعدادي",
        class: createdClasses[7]._id,
        notes: "",
      },

      // ثانوي
      {
        name: "بيشوي مينا",
        age: 16,
        phone: "01555666777",
        parentName: "مينا بيشوي",
        stage: "Secondary",
        grade: "ثانوي",
        class: createdClasses[8]._id,
        notes: "متفوق أكاديمياً",
      },
      {
        name: "إيريني جرجس",
        age: 17,
        phone: "01666777888",
        parentName: "جرجس إيريني",
        stage: "Secondary",
        grade: "ثانوي",
        class: createdClasses[8]._id,
        notes: "تساعد في تنظيم الأنشطة",
      },
    ];

    const createdChildren = await Child.insertMany(children);
    console.log(`✅ Created ${createdChildren.length} children`);

    // Create Attendance Records
    console.log("📅 Creating attendance records...");

    const attendanceRecords = [];
    const fridayDates = getFridayDatesBack(12); // Last 12 weeks

    // Create attendance for each child for each Friday
    createdChildren.forEach((child) => {
      fridayDates.forEach((date) => {
        // Random attendance with 75% chance of being present
        const isPresent = Math.random() > 0.25;

        attendanceRecords.push({
          person: child._id,
          personModel: "Child",
          date: date,
          status: isPresent ? "present" : "absent",
          type: "child",
          notes: isPresent ? "" : "غياب عذر",
          recordedBy: createdUsers.find((u) => u.role === "admin")._id,
          class: child.class,
        });
      });
    });

    const createdAttendance = await Attendance.insertMany(attendanceRecords);
    console.log(`✅ Created ${createdAttendance.length} attendance records`);

    console.log("🌱 Seeding completed successfully!");
    console.log("\n📋 Login credentials:");
    console.log("👨‍💼 Admins:");
    console.log("   • keroles / keroles123");
    console.log("   • emad / emad123");
    console.log("👩‍🏫 Servants:");
    console.log("   • hadana / hadana123 (حضانة)");
    console.log("   • oola / oola123 (أولى ابتدائي)");
    console.log("   • tanya / tanya123 (تانية ابتدائي)");
    console.log("   • talta / talta123 (تالتة ابتدائي)");
    console.log("   • rabaa / rabaa123 (رابعة ابتدائي)");
    console.log("   • khamsa / khamsa123 (خامسة ابتدائي)");
    console.log("   • sata / sata123 (ساتة ابتدائي)");
    console.log("   • aadady / aadady123 (إعدادي)");
    console.log("   • thanwy / thanwy123 (ثانوي)");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  }
};

// Run the seeder
const runSeeder = async () => {
  await connectDB();
  await seedData();
  await mongoose.connection.close();
  console.log("🔌 Database connection closed");
  process.exit(0);
};

runSeeder();
