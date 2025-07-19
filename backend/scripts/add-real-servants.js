const mongoose = require("mongoose");
const User = require("../models/User");

mongoose.connect(
  "mongodb+srv://yasamasry:Yasa_jaber12345@marygerges.f7mwc5q.mongodb.net/margerges_church?retryWrites=true&w=majority&appName=maryGerges"
);

async function addRealServants() {
  try {
    // قائمة الخدام الحقيقيين
    const realServants = [
      { name: "يسي جابر", phone: "01149079150" },
      { name: "ابانوب شنوده", phone: "01552813341" },
      { name: "توماس عاطف", phone: "01117586142" },
      { name: "كاترين وديع", phone: "01221567672" },
      { name: "عدلي بداري", phone: "01112150708" },
      { name: "انيس عاطف", phone: "01147736649" },
      { name: "باخوم منير", phone: "01123363360" },
      { name: "لويز صفي", phone: "01204124413" },
      { name: "مارينا ويصا", phone: "01279249593" },
      { name: "مهرائيل ويصا", phone: "01205152096" },
      { name: "كيرلس صفي", phone: "01210346092" },
      { name: "توماس سامي", phone: "01068184360" },
      { name: "دميانه جابر", phone: "01145341689" },
      { name: "مينا وليم", phone: "01123483577" },
      { name: "بيشوي ملاك", phone: "01288798956" },
      { name: "دميانه ناجح", phone: "01144738869" },
      { name: "جومانا مدحت", phone: "01120949245" },
      { name: "كيرلس بداري", phone: "01152620733" },
      { name: "تهاني روماني", phone: "01158363604" },
      { name: "مريم صفي", phone: "01280295397" },
      { name: "مريم رفعت", phone: "01156237332" },
      { name: "مارينا رفعت", phone: "01144091869" },
      { name: "ساره ندهي", phone: "01156229889" },
    ];

    console.log("=== حذف الخدام المؤقتين ===");
    // احذف الخدام المؤقتين (اللي مش admin وليهم assigned class)
    const tempServants = await User.find({
      role: "servant",
      assignedClass: { $exists: true },
    });
    console.log("عدد الخدام المؤقتين:", tempServants.length);

    for (const servant of tempServants) {
      console.log("حذف:", servant.name);
    }

    await User.deleteMany({
      role: "servant",
      assignedClass: { $exists: true },
    });

    console.log("\n=== إضافة الخدام الحقيقيين ===");
    const newServants = [];

    for (const servantData of realServants) {
      const servant = new User({
        name: servantData.name,
        username: servantData.name.replace(/\s+/g, "_").toLowerCase(), // username from name
        password: "temp123", // مؤقت
        role: "servant",
        phone: servantData.phone,
        isActive: true,
        // مش هحط assignedClass علشان ميقدروش يدخلوا
      });

      newServants.push(servant);
      console.log("إضافة:", servantData.name, "-", servantData.phone);
    }

    await User.insertMany(newServants);

    console.log("\n✅ تم إضافة", realServants.length, "خادم جديد");
    console.log(
      "📝 الخدام دول هيظهروا لأمين الخدمة بس مش هيقدروا يدخلوا التطبيق"
    );
    console.log("🔐 accounts الدخول لسه بأسماء الفصول زي ما هي");

    process.exit(0);
  } catch (error) {
    console.error("خطأ:", error);
    process.exit(1);
  }
}

addRealServants();
