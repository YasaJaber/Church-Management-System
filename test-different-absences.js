const fetch = require("node-fetch");

async function testDifferentAbsences() {
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

    // Calculate Friday dates
    const today = new Date();
    const dayOfWeek = today.getDay();
    let daysAgo =
      dayOfWeek === 5 ? 0 : dayOfWeek > 5 ? dayOfWeek - 5 : dayOfWeek + 2;

    const fridays = [];
    for (let i = 0; i < 6; i++) {
      const friday = new Date();
      friday.setDate(today.getDate() - daysAgo - i * 7);
      fridays.push(friday.toISOString().split("T")[0]);
    }

    console.log("📅 Friday dates:", fridays);

    // Create different absence patterns:

    // 1. Child absent 2 weeks (فيرونيا - was present last week, mark absent this week)
    await fetch("http://localhost:5000/api/attendance", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        childId: "687aad664d8c578316f4c1f2", // فيرونيا عادل
        date: fridays[0], // This week
        status: "absent",
        notes: "غائب هذا الأسبوع",
      }),
    });

    // 2. Child absent 3 weeks (مايكل - was present 2 weeks ago, absent last week and this week)
    await fetch("http://localhost:5000/api/attendance", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        childId: "687aad664d8c578316f4c1f3", // مايكل رومانى
        date: fridays[1], // 2 weeks ago
        status: "present",
        notes: "حضر قبل أسبوعين",
      }),
    });

    console.log("\n✅ Added attendance patterns");
    console.log(
      "   - فيرونيا: present last week, absent this week (2 weeks total absence)"
    );
    console.log(
      "   - مايكل: present 2 weeks ago, absent since then (2 weeks absence)"
    );

    // Test follow-up API
    const followUpResponse = await fetch(
      "http://localhost:5000/api/attendance/follow-up",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const followUpData = await followUpResponse.json();

    console.log("\n📊 Follow-up Results with Different Absence Patterns:");
    console.log(
      `Total children needing follow-up: ${followUpData.data.summary.totalFollowUpChildren}`
    );
    console.log(`Number of groups: ${followUpData.data.summary.groupsCount}`);

    followUpData.data.groups.forEach((group) => {
      console.log(
        `\n👥 Group: ${group.consecutiveWeeks} consecutive weeks absent - ${group.count} children`
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

testDifferentAbsences();
