const fetch = require("node-fetch");

async function simpleTest() {
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

    // Get attendance records for a specific child
    console.log("📊 Getting attendance for مايكل رومانى...");

    const attendanceResponse = await fetch(
      "http://localhost:5000/api/attendance/children?childId=687aad664d8c578316f4c1f3",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (attendanceResponse.ok) {
      const attendanceData = await attendanceResponse.json();
      console.log("📝 Attendance records:");
      attendanceData.data.forEach((record) => {
        console.log(
          `   ${record.date}: ${record.status} (${record.notes || "no notes"})`
        );
      });
    }

    // Test follow-up for this specific pattern
    console.log("\n🔍 Manual calculation:");
    console.log("Expected: مايكل should be absent 2 consecutive weeks");
    console.log("- Present 2025-07-11 (2 weeks ago)");
    console.log("- Absent 2025-07-18 (this week) - no record = absent");
    console.log("- Absent 2025-07-04 (1 week ago) - no record = absent");

    // Get follow-up results
    const followUpResponse = await fetch(
      "http://localhost:5000/api/attendance/follow-up",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const followUpData = await followUpResponse.json();

    console.log("\n📊 Follow-up Results:");
    console.log(`Total: ${followUpData.data.summary.totalFollowUpChildren}`);

    const mikaelInResults = followUpData.data.groups
      .flatMap((group) => group.children)
      .find((child) => child.name === "مايكل رومانى");

    if (mikaelInResults) {
      console.log(
        `✅ Found مايكل with ${mikaelInResults.consecutiveAbsences} consecutive absences`
      );
    } else {
      console.log("❌ مايكل NOT found in follow-up results");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

simpleTest();
