const fetch = require("node-fetch");

async function clearServantsFollowUp() {
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

    // Get all servants
    console.log("👥 Getting all servants...");
    const servantsResponse = await fetch("http://localhost:5000/api/servants", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const servantsData = await servantsResponse.json();
    const servants = servantsData.data;

    console.log(`🔧 Found ${servants.length} servants`);

    // Get current Friday date
    const today = new Date();
    const dayOfWeek = today.getDay();
    let daysAgo =
      dayOfWeek === 5 ? 0 : dayOfWeek > 5 ? dayOfWeek - 5 : dayOfWeek + 2;

    const currentFriday = new Date();
    currentFriday.setDate(today.getDate() - daysAgo);
    const fridayDate = currentFriday.toISOString().split("T")[0];

    console.log(`📅 Marking servants attendance for: ${fridayDate}\n`);

    // Mark all servants as present
    let successCount = 0;
    for (const servant of servants) {
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
              date: fridayDate,
              status: "present",
              notes: "تنظيف قائمة افتقاد الخدام - حضر",
            }),
          }
        );

        if (response.ok) {
          successCount++;
          console.log(`✅ ${servant.name} - marked present`);
        } else {
          console.log(`❌ ${servant.name} - failed to mark`);
        }
      } catch (error) {
        console.log(`❌ ${servant.name} - error: ${error.message}`);
      }
    }

    console.log(
      `\n📊 Marked ${successCount}/${servants.length} servants as present`
    );

    // Check servants follow-up after clearing
    console.log("\n🔍 Checking servants follow-up list after clearing...");
    const followUpResponse = await fetch(
      "http://localhost:5000/api/servants/statistics/follow-up",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const followUpData = await followUpResponse.json();

    console.log(`\n🎯 Servants Follow-up Results:`);
    console.log(
      `   Total servants needing follow-up: ${followUpData.data.summary.totalFollowUpServants}`
    );
    console.log(
      `   Number of groups: ${followUpData.data.summary.groupsCount}`
    );

    if (followUpData.data.summary.totalFollowUpServants === 0) {
      console.log("\n🎉 Perfect! Servants follow-up list is now empty!");
      console.log("✅ You can now test the servants follow-up system");
      console.log(
        '👥 Go to Servants → Statistics to see the new "افتقاد الخدام" section'
      );
      console.log(
        "📱 Mark some servants as absent for consecutive weeks to test"
      );
    } else {
      console.log("\n⚠️  Some servants still in follow-up:");
      followUpData.data.groups.forEach((group) => {
        console.log(
          `   ${group.consecutiveWeeks} weeks: ${group.servants
            .map((s) => s.name)
            .join(", ")}`
        );
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

clearServantsFollowUp();
