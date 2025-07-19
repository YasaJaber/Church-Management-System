const fetch = require("node-fetch");

async function testChartData() {
  try {
    console.log("🧪 Testing Chart Data APIs...\n");

    // Login
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "keroles", password: "keroles123" }),
    });
    const {
      data: { token },
    } = await loginResponse.json();

    console.log("✅ Login successful\n");

    // Test Children Statistics
    console.log("📊 Testing Children Statistics...");
    const childrenStatsResponse = await fetch(
      "http://localhost:5000/api/statistics/attendance?days=7",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const childrenStats = await childrenStatsResponse.json();

    console.log("📈 Children Attendance API Response:");
    console.log("   Success:", childrenStats.success);
    if (
      childrenStats.success &&
      childrenStats.data &&
      childrenStats.data.daily
    ) {
      console.log("   Daily Data Length:", childrenStats.data.daily.length);
      console.log("   Sample Data:");
      childrenStats.data.daily.slice(0, 3).forEach((day, index) => {
        console.log(
          `     Day ${index + 1}: ${day.date} - Present: ${
            day.present
          }, Absent: ${day.absent}`
        );
      });
    } else {
      console.log("   ❌ No daily data found");
      console.log(
        "   Data structure:",
        JSON.stringify(childrenStats.data, null, 2)
      );
    }

    // Test Servants Statistics
    console.log("\n👥 Testing Servants Statistics...");
    const servantsStatsResponse = await fetch(
      "http://localhost:5000/api/servants/statistics/attendance?days=7",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const servantsStats = await servantsStatsResponse.json();

    console.log("📈 Servants Attendance API Response:");
    console.log("   Success:", servantsStats.success);
    if (
      servantsStats.success &&
      servantsStats.data &&
      servantsStats.data.daily
    ) {
      console.log("   Daily Data Length:", servantsStats.data.daily.length);
      console.log("   Sample Data:");
      servantsStats.data.daily.slice(0, 3).forEach((day, index) => {
        console.log(
          `     Day ${index + 1}: ${day.date} - Present: ${
            day.present
          }, Absent: ${day.absent}`
        );
      });
    } else {
      console.log("   ❌ No daily data found");
      console.log(
        "   Data structure:",
        JSON.stringify(servantsStats.data, null, 2)
      );
    }

    // Test General Stats
    console.log("\n📊 Testing General Statistics...");
    const generalStatsResponse = await fetch(
      "http://localhost:5000/api/statistics/church",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const generalStats = await generalStatsResponse.json();

    console.log("📈 General Stats API Response:");
    console.log("   Success:", generalStats.success);
    if (generalStats.success) {
      console.log("   Total Children:", generalStats.data.totalChildren);
      console.log("   Today Present:", generalStats.data.presentToday);
      console.log("   Attendance Rate:", generalStats.data.attendanceRate);
    }

    console.log("\n🎯 Summary:");
    console.log(
      "   Children Chart Data:",
      childrenStats.success && childrenStats.data?.daily?.length > 0
        ? "✅ Available"
        : "❌ Missing"
    );
    console.log(
      "   Servants Chart Data:",
      servantsStats.success && servantsStats.data?.daily?.length > 0
        ? "✅ Available"
        : "❌ Missing"
    );
    console.log(
      "   General Statistics:",
      generalStats.success ? "✅ Available" : "❌ Missing"
    );

    if (childrenStats.success && childrenStats.data?.daily?.length > 0) {
      console.log("\n🎨 Chart should be working for Children!");
    } else {
      console.log('\n⚠️  Children chart might show "لا توجد بيانات حضور"');
    }

    if (servantsStats.success && servantsStats.data?.daily?.length > 0) {
      console.log("🎨 Chart should be working for Servants!");
    } else {
      console.log('⚠️  Servants chart might show "لا توجد بيانات حضور خدام"');
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testChartData();
