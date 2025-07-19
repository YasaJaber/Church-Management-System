const fetch = require("node-fetch");

async function clearFollowUp() {
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

    // Get all children
    console.log("📋 Getting all children...");
    const childrenResponse = await fetch("http://localhost:5000/api/children", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const childrenData = await childrenResponse.json();
    const children = childrenData.data;

    console.log(`👶 Found ${children.length} children`);

    // Get current Friday date
    const today = new Date();
    const dayOfWeek = today.getDay();
    let daysAgo =
      dayOfWeek === 5 ? 0 : dayOfWeek > 5 ? dayOfWeek - 5 : dayOfWeek + 2;

    const currentFriday = new Date();
    currentFriday.setDate(today.getDate() - daysAgo);
    const fridayDate = currentFriday.toISOString().split("T")[0];

    console.log(`📅 Marking attendance for: ${fridayDate}\n`);

    // Mark all children as present
    let successCount = 0;
    for (const child of children) {
      try {
        const response = await fetch("http://localhost:5000/api/attendance", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            childId: child._id,
            date: fridayDate,
            status: "present",
            notes: "تنظيف قائمة الافتقاد - حضر",
          }),
        });

        if (response.ok) {
          successCount++;
          console.log(`✅ ${child.name} - marked present`);
        } else {
          console.log(`❌ ${child.name} - failed to mark`);
        }
      } catch (error) {
        console.log(`❌ ${child.name} - error: ${error.message}`);
      }
    }

    console.log(
      `\n📊 Marked ${successCount}/${children.length} children as present`
    );

    // Check follow-up after clearing
    console.log("\n🔍 Checking follow-up list after clearing...");
    const followUpResponse = await fetch(
      "http://localhost:5000/api/attendance/follow-up",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const followUpData = await followUpResponse.json();

    console.log(`\n🎯 Follow-up Results:`);
    console.log(
      `   Total children needing follow-up: ${followUpData.data.summary.totalFollowUpChildren}`
    );
    console.log(
      `   Number of groups: ${followUpData.data.summary.groupsCount}`
    );

    if (followUpData.data.summary.totalFollowUpChildren === 0) {
      console.log("\n🎉 Perfect! Follow-up list is now empty!");
      console.log(
        "✅ You can now test the system by marking children as absent"
      );
      console.log(
        "📱 Use the app to mark some children absent for consecutive weeks"
      );
    } else {
      console.log("\n⚠️  Some children still in follow-up:");
      followUpData.data.groups.forEach((group) => {
        console.log(
          `   ${group.consecutiveWeeks} weeks: ${group.children
            .map((c) => c.name)
            .join(", ")}`
        );
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

clearFollowUp();
