const fetch = require("node-fetch");

async function quickTest() {
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

    // Get first child
    const childrenResponse = await fetch("http://localhost:5000/api/children", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const children = (await childrenResponse.json()).data;

    // Record attendance for today
    const today = new Date().toISOString().split("T")[0];
    const attendanceResponse = await fetch(
      "http://localhost:5000/api/attendance",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId: children[0]._id,
          date: today,
          status: "present",
          notes: "Final timezone test",
        }),
      }
    );

    const result = await attendanceResponse.json();

    if (result.success) {
      console.log("🎯 TIMEZONE FIX RESULT:");
      console.log(`   Expected date: ${today}`);
      console.log(`   Saved date: ${result.data.date}`);
      console.log(
        `   ✅ Match: ${
          result.data.date === today ? "YES - FIXED!" : "NO - Still broken"
        }`
      );

      if (result.data.date === today) {
        console.log("\n🎉 SUCCESS! Timezone issue is FIXED!");
        console.log("📱 The app will now show correct timestamps.");
        console.log("⏰ Attendance records will save with proper date/time.");
      } else {
        console.log(
          "\n❌ Still has timezone issue. May need further debugging."
        );
      }
    } else {
      console.log("❌ Test failed:", result.error);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

quickTest();
