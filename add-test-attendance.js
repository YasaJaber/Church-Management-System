const fetch = require("node-fetch");

async function addTestAttendance() {
  try {
    // Login first
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "keroles", password: "keroles123" }),
    });
    const {
      data: { token },
    } = await loginResponse.json();

    // Get today's date (Friday format)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
    let daysAgo = 0;
    if (dayOfWeek === 5) daysAgo = 0; // Today is Friday
    else if (dayOfWeek > 5) daysAgo = dayOfWeek - 5; // Weekend
    else daysAgo = dayOfWeek + 2; // Weekday

    const mostRecentFriday = new Date();
    mostRecentFriday.setDate(today.getDate() - daysAgo);
    const fridayDate = mostRecentFriday.toISOString().split("T")[0];

    // Get previous Friday (1 week ago)
    const previousFriday = new Date(mostRecentFriday);
    previousFriday.setDate(previousFriday.getDate() - 7);
    const previousFridayDate = previousFriday.toISOString().split("T")[0];

    console.log("📅 Most recent Friday:", fridayDate);
    console.log("📅 Previous Friday:", previousFridayDate);

    // Mark some children as present on recent Friday
    const presentChildren = [
      "687aad664d8c578316f4c1ee", // بيتر سمير - present this week
      "687aad664d8c578316f4c1f0", // مريم جورج - present this week
      "687aad664d8c578316f4c1f1", // مارك صموئيل - present this week
    ];

    // Mark some children as present on previous Friday only (absent 1 week)
    const presentLastWeekOnly = [
      "687aad664d8c578316f4c1f2", // فيرونيا عادل - absent 1 week
      "687aad664d8c578316f4c1f3", // مايكل رومانى - absent 1 week
    ];

    // Add attendance records
    console.log("\n📝 Adding attendance records...");

    // Present this week
    for (const childId of presentChildren) {
      const response = await fetch("http://localhost:5000/api/attendance", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId,
          date: fridayDate,
          status: "present",
          notes: "حضر مدرسة الأحد",
        }),
      });
      const result = await response.json();
      console.log(`✅ ${fridayDate}: Child ${childId} marked present`);
    }

    // Present last week only
    for (const childId of presentLastWeekOnly) {
      const response = await fetch("http://localhost:5000/api/attendance", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId,
          date: previousFridayDate,
          status: "present",
          notes: "حضر الأسبوع الماضي",
        }),
      });
      console.log(`✅ ${previousFridayDate}: Child ${childId} marked present`);
    }

    console.log("\n🔍 Testing follow-up API again...");
    const followUpResponse = await fetch(
      "http://localhost:5000/api/attendance/follow-up",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const followUpData = await followUpResponse.json();

    console.log("\n📊 Updated Follow-up Results:");
    console.log(
      `Total children needing follow-up: ${followUpData.data.summary.totalFollowUpChildren}`
    );
    console.log(`Number of groups: ${followUpData.data.summary.groupsCount}`);

    followUpData.data.groups.forEach((group) => {
      console.log(
        `\n👥 Group: ${group.consecutiveWeeks} consecutive weeks - ${group.count} children`
      );
      group.children.forEach((child) => {
        console.log(
          `   - ${child.name} (${child.consecutiveAbsences} weeks absent)`
        );
      });
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

addTestAttendance();
