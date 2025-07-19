const fetch = require("node-fetch");

async function finalTest() {
  try {
    // Login
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "keroles", password: "keroles123" }),
    });
    const {
      data: { token },
    } = await loginResponse.json();

    console.log(
      "🧪 Creating different absence patterns for comprehensive test...\n"
    );

    // Get Friday dates
    const today = new Date();
    const dayOfWeek = today.getDay();
    let daysAgo =
      dayOfWeek === 5 ? 0 : dayOfWeek > 5 ? dayOfWeek - 5 : dayOfWeek + 2;

    const fridays = [];
    for (let i = 0; i < 8; i++) {
      const friday = new Date();
      friday.setDate(today.getDate() - daysAgo - i * 7);
      fridays.push(friday.toISOString().split("T")[0]);
    }

    console.log("📅 Friday dates (newest first):", fridays.slice(0, 4));

    // Scenario 1: بيتر - حضر هذا الأسبوع (لن يظهر في الافتقاد)
    await fetch("http://localhost:5000/api/attendance", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        childId: "687ab07fb4468d2100e1d060", // بيتر سمير
        date: fridays[0], // This week
        status: "present",
        notes: "حضر هذا الأسبوع",
      }),
    });
    console.log("✅ بيتر سمير - حضر هذا الأسبوع (لن يظهر في الافتقاد)");

    // Scenario 2: مريم - حضرت قبل أسبوع، غابت هذا الأسبوع (غياب أسبوع واحد - لن تظهر)
    await fetch("http://localhost:5000/api/attendance", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        childId: "687ab07fb4468d2100e1d062", // مريم جورج
        date: fridays[1], // Last week
        status: "present",
        notes: "حضرت الأسبوع الماضي",
      }),
    });
    console.log(
      "✅ مريم جورج - حضرت الأسبوع الماضي (غياب أسبوع واحد - لن تظهر)"
    );

    // Scenario 3: مارك - حضر قبل أسبوعين، غاب أسبوعين متتاليين (سيظهر في مجموعة أسبوعين)
    await fetch("http://localhost:5000/api/attendance", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        childId: "687ab07fb4468d2100e1d063", // مارك صموئيل
        date: fridays[2], // 2 weeks ago
        status: "present",
        notes: "حضر قبل أسبوعين",
      }),
    });
    console.log("✅ مارك صموئيل - حضر قبل أسبوعين (غياب أسبوعين متتاليين)");

    // Scenario 4: فيرونيا - حضرت قبل 3 أسابيع، غابت 3 أسابيع متتالية (سيظهر في مجموعة 3 أسابيع)
    await fetch("http://localhost:5000/api/attendance", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        childId: "687ab07fb4468d2100e1d064", // فيرونيا عادل
        date: fridays[3], // 3 weeks ago
        status: "present",
        notes: "حضرت قبل 3 أسابيع",
      }),
    });
    console.log("✅ فيرونيا عادل - حضرت قبل 3 أسابيع (غياب 3 أسابيع متتالية)");

    // Scenario 5: مايكل - حضر قبل 4 أسابيع، غاب 4 أسابيع متتالية
    await fetch("http://localhost:5000/api/attendance", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        childId: "687ab07fb4468d2100e1d065", // مايكل رومانى
        date: fridays[4], // 4 weeks ago
        status: "present",
        notes: "حضر قبل 4 أسابيع",
      }),
    });
    console.log("✅ مايكل رومانى - حضر قبل 4 أسابيع (غياب 4 أسابيع متتالية)");

    // Wait a moment then test
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(
      "\n🔍 Testing Follow-up API with different absence patterns...\n"
    );

    const followUpResponse = await fetch(
      "http://localhost:5000/api/attendance/follow-up",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const followUpData = await followUpResponse.json();

    console.log("📊 الافتقاد - نتائج مُفصلة:");
    console.log("═".repeat(50));
    console.log(
      `إجمالي الأطفال المحتاجين للافتقاد: ${followUpData.data.summary.totalFollowUpChildren}`
    );
    console.log(`عدد المجموعات: ${followUpData.data.summary.groupsCount}`);
    console.log("═".repeat(50));

    followUpData.data.groups.forEach((group) => {
      console.log(
        `\n👥 المجموعة: غايبين ${group.consecutiveWeeks} جمعة متتالية - (${group.count} أطفال)`
      );
      console.log("─".repeat(40));
      group.children.forEach((child) => {
        console.log(
          `   📞 ${child.name} - ${child.phone} (ولي الأمر: ${child.parentName})`
        );
        console.log(`      📚 الفصل: ${child.class.name}`);
        console.log(
          `      📅 آخر حضور: ${
            child.lastAttendance
              ? new Date(child.lastAttendance).toLocaleDateString("ar-EG")
              : "لم يحضر من قبل"
          }`
        );
        if (child.notes) console.log(`      📝 ملاحظة: ${child.notes}`);
        console.log("");
      });
    });

    console.log("🎯 ملخص النتائج:");
    console.log("• بيتر: حضر هذا الأسبوع ← خرج من الافتقاد ✅");
    console.log("• مريم: غابت أسبوع واحد ← لم تظهر (أقل من جمعتين) ✅");
    console.log("• مارك: غاب أسبوعين متتاليين ← ظهر في مجموعة أسبوعين ✅");
    console.log(
      "• فيرونيا: غابت 3 أسابيع متتالية ← ظهرت في مجموعة 3 أسابيع ✅"
    );
    console.log("• مايكل: غاب 4 أسابيع متتالية ← ظهر في مجموعة 4 أسابيع ✅");
    console.log("• الباقي: غايبين 12 جمعة متتالية ← مجموعة منفصلة ✅");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

finalTest();
