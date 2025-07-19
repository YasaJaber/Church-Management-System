const fetch = require("node-fetch");

async function testTimezoneFix() {
  try {
    console.log("🕒 Testing Timezone Fix...\n");

    // Login
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "keroles", password: "keroles123" }),
    });
    const {
      data: { token },
    } = await loginResponse.json();

    // Get first child
    const childrenResponse = await fetch("http://localhost:5000/api/children", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const children = (await childrenResponse.json()).data;
    const firstChild = children[0];

    console.log(`👶 Testing with child: ${firstChild.name}`);
    console.log(
      `🗓️  Current time in Egypt: ${new Date().toLocaleString("ar-EG", {
        timeZone: "Africa/Cairo",
      })}`
    );

    // Record attendance with today's date
    const today = new Date().toISOString().split("T")[0];
    console.log(`📅 Recording attendance for date: ${today}`);

    const attendanceResponse = await fetch(
      "http://localhost:5000/api/attendance",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId: firstChild._id,
          date: today,
          status: "present",
          notes: "Test timezone fix - تسجيل تجريبي للوقت",
        }),
      }
    );

    const attendanceData = await attendanceResponse.json();

    if (attendanceData.success) {
      console.log("\n✅ Attendance recorded successfully!");
      console.log("📊 Response data:");
      console.log(`   Child: ${attendanceData.data.child.name}`);
      console.log(`   Status: ${attendanceData.data.status}`);
      console.log(`   Date: ${attendanceData.data.date}`);
      console.log(`   Notes: ${attendanceData.data.notes}`);
    } else {
      console.log("❌ Failed to record attendance:", attendanceData.error);
      return;
    }

    // Now check the recent attendance records to see the timestamps
    console.log("\n🔍 Checking recent attendance records...");
    const recentResponse = await fetch(
      `http://localhost:5000/api/attendance/children?date=${today}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const recentData = await recentResponse.json();

    if (recentData.success && recentData.data.length > 0) {
      console.log("\n📋 Recent attendance records:");
      recentData.data.slice(0, 3).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.child.name}:`);
        console.log(`      Status: ${record.status}`);
        console.log(`      Date: ${record.date}`);
        console.log(`      Notes: ${record.notes || "لا توجد ملاحظات"}`);
      });

      // Check if our test record is there
      const ourRecord = recentData.data.find(
        (r) =>
          r.child._id === firstChild._id && r.notes?.includes("Test timezone")
      );
      if (ourRecord) {
        console.log("\n🎯 Our test record found:");
        console.log(`   Date stored: ${ourRecord.date}`);
        console.log(`   Expected: ${today}`);
        console.log(`   ✅ Match: ${ourRecord.date === today ? "YES" : "NO"}`);
      }
    }

    // Test servants attendance too
    console.log("\n👥 Testing servants attendance...");
    const servantsResponse = await fetch("http://localhost:5000/api/servants", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const servants = (await servantsResponse.json()).data;
    const firstServant = servants[0];

    console.log(`👤 Testing with servant: ${firstServant.name}`);

    const servantAttendanceResponse = await fetch(
      "http://localhost:5000/api/servants/attendance",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          servantId: firstServant._id,
          date: today,
          status: "present",
          notes: "Test timezone fix for servant - تسجيل تجريبي للخادم",
        }),
      }
    );

    const servantData = await servantAttendanceResponse.json();

    if (servantData.success) {
      console.log("\n✅ Servant attendance recorded successfully!");
      console.log("📊 Servant data:");
      console.log(`   Servant: ${servantData.data.person.name}`);
      console.log(`   Status: ${servantData.data.status}`);
      console.log(
        `   Date: ${
          new Date(servantData.data.date).toISOString().split("T")[0]
        }`
      );
      console.log(`   Notes: ${servantData.data.notes}`);

      // Check the timestamp
      const savedDate = new Date(servantData.data.date)
        .toISOString()
        .split("T")[0];
      console.log(`\n🕒 Timezone test:`);
      console.log(`   Expected date: ${today}`);
      console.log(`   Saved date: ${savedDate}`);
      console.log(
        `   ✅ Match: ${
          savedDate === today
            ? "YES - TIMEZONE FIXED!"
            : "NO - Still has timezone issue"
        }`
      );
    } else {
      console.log("❌ Failed to record servant attendance:", servantData.error);
    }

    console.log("\n🎯 SUMMARY:");
    console.log("   If dates match exactly, timezone issue is FIXED! ✅");
    console.log("   If dates are different, timezone issue still exists ❌");
    console.log("   App should now show correct timestamps! 📱");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testTimezoneFix();
