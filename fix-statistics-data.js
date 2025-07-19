const fetch = require("node-fetch");

async function fixStatisticsData() {
  try {
    console.log("🔧 Fixing Statistics Data...\n");

    // Login as admin
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "keroles", password: "keroles123" }),
    });
    const {
      data: { token },
    } = await loginResponse.json();

    // Get all children
    console.log("👶 Getting children list...");
    const childrenResponse = await fetch("http://localhost:5000/api/children", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const childrenData = await childrenResponse.json();
    const children = childrenData.data;

    // Get all servants
    console.log("👥 Getting servants list...");
    const servantsResponse = await fetch("http://localhost:5000/api/servants", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const servantsData = await servantsResponse.json();
    const servants = servantsData.data;

    console.log(
      `📊 Found ${children.length} children and ${servants.length} servants\n`
    );

    // Generate last 4 Friday dates
    const today = new Date();
    const dayOfWeek = today.getDay();
    let daysAgo =
      dayOfWeek === 5 ? 0 : dayOfWeek > 5 ? dayOfWeek - 5 : dayOfWeek + 2;

    const fridays = [];
    for (let i = 0; i < 4; i++) {
      const friday = new Date();
      friday.setDate(today.getDate() - daysAgo - i * 7);
      fridays.push(friday.toISOString().split("T")[0]);
    }

    console.log("📅 Adding attendance for Fridays:", fridays);

    // Add realistic children attendance
    console.log("\n👶 Adding children attendance...");
    let childrenAdded = 0;

    for (const friday of fridays) {
      console.log(`\n📅 Processing ${friday}:`);

      // Randomly make 70-90% of children present
      const shuffledChildren = [...children].sort(() => Math.random() - 0.5);
      const presentCount = Math.floor(
        children.length * (0.7 + Math.random() * 0.2)
      ); // 70-90%
      const presentChildren = shuffledChildren.slice(0, presentCount);
      const absentChildren = shuffledChildren.slice(presentCount);

      // Mark present children
      for (const child of presentChildren) {
        try {
          const response = await fetch("http://localhost:5000/api/attendance", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              childId: child._id,
              date: friday,
              status: "present",
              notes: "حضور تلقائي - إصلاح البيانات",
            }),
          });

          if (response.ok) {
            childrenAdded++;
            console.log(`   ✅ ${child.name} - حاضر`);
          }
        } catch (error) {
          console.log(`   ❌ ${child.name} - خطأ: ${error.message}`);
        }
      }

      // Mark some absent children
      for (const child of absentChildren.slice(0, 2)) {
        // Mark 2 as explicitly absent
        try {
          const response = await fetch("http://localhost:5000/api/attendance", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              childId: child._id,
              date: friday,
              status: "absent",
              notes: "غياب تلقائي - إصلاح البيانات",
            }),
          });

          if (response.ok) {
            console.log(`   ❌ ${child.name} - غائب`);
          }
        } catch (error) {
          console.log(`   ❌ ${child.name} - خطأ: ${error.message}`);
        }
      }

      console.log(
        `   📊 ${friday}: ~${presentCount} حاضر من ${children.length}`
      );
    }

    // Add realistic servants attendance
    console.log("\n👥 Adding servants attendance...");
    let servantsAdded = 0;

    for (const friday of fridays) {
      console.log(`\n📅 Processing servants for ${friday}:`);

      // Randomly make 80-95% of servants present
      const shuffledServants = [...servants].sort(() => Math.random() - 0.5);
      const presentCount = Math.floor(
        servants.length * (0.8 + Math.random() * 0.15)
      ); // 80-95%
      const presentServants = shuffledServants.slice(0, presentCount);

      // Mark present servants
      for (const servant of presentServants) {
        try {
          const response = await fetch(
            "http://localhost:5000/api/servants/attendance",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                servantId: servant._id,
                date: friday,
                status: "present",
                notes: "حضور تلقائي - إصلاح البيانات",
              }),
            }
          );

          if (response.ok) {
            servantsAdded++;
            console.log(`   ✅ ${servant.name} - حاضر`);
          }
        } catch (error) {
          console.log(`   ❌ ${servant.name} - خطأ: ${error.message}`);
        }
      }

      console.log(
        `   📊 ${friday}: ~${presentCount} خادم حاضر من ${servants.length}`
      );
    }

    console.log(`\n🎉 تم إضافة ${childrenAdded} سجل حضور للأطفال`);
    console.log(`🎉 تم إضافة ${servantsAdded} سجل حضور للخدام`);

    // Test the results
    console.log("\n🧪 Testing fixed statistics...");

    // Test children stats
    const testChildrenResponse = await fetch(
      "http://localhost:5000/api/statistics/attendance?days=7",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const testChildren = await testChildrenResponse.json();

    // Test servants stats
    const testServantsResponse = await fetch(
      "http://localhost:5000/api/servants/statistics/attendance?days=7",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const testServants = await testServantsResponse.json();

    console.log("\n📊 Results:");
    if (testChildren.success && testChildren.data.daily) {
      const childrenTotal = testChildren.data.daily.reduce(
        (sum, day) => sum + day.present,
        0
      );
      console.log(`   ✅ Children: ${childrenTotal} total attendance records`);
      console.log(
        `   📈 Sample day: ${testChildren.data.daily[0].present} present on ${testChildren.data.daily[0].date}`
      );
    }

    if (testServants.success && testServants.data.daily) {
      const servantsTotal = testServants.data.daily.reduce(
        (sum, day) => sum + day.present,
        0
      );
      console.log(`   ✅ Servants: ${servantsTotal} total attendance records`);
      console.log(
        `   📈 Sample day: ${testServants.data.daily[0].present} present on ${testServants.data.daily[0].date}`
      );
    }

    console.log("\n🎯 Statistics should now show proper data!");
    console.log("📱 Refresh the app to see the updated charts and numbers");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

fixStatisticsData();
