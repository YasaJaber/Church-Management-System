const fetch = require("node-fetch");

// Replicate the exact getFridayDatesBack function from backend
function getFridayDatesBack(weeksBack) {
  const fridays = [];
  const today = new Date();
  console.log(
    `🗓️  Today: ${
      today.toISOString().split("T")[0]
    } (${today.toLocaleDateString("en", { weekday: "long" })})`
  );

  for (let i = 0; i < weeksBack; i++) {
    const friday = new Date();
    // Find this week's Friday first
    const dayOfWeek = today.getDay();
    let daysToSubtract;

    if (dayOfWeek === 5) {
      // Today is Friday
      daysToSubtract = i * 7;
    } else if (dayOfWeek > 5) {
      // Weekend, go to last Friday
      daysToSubtract = dayOfWeek - 5 + i * 7;
    } else {
      // Weekday, go to previous Friday
      daysToSubtract = dayOfWeek + 2 + i * 7;
    }

    friday.setDate(today.getDate() - daysToSubtract);
    fridays.push(friday.toISOString().split("T")[0]);
    console.log(
      `   Week ${i + 1}: ${
        friday.toISOString().split("T")[0]
      } (subtract ${daysToSubtract} days)`
    );
  }

  return fridays;
}

async function fixDatesProperly() {
  try {
    console.log("🔧 Fixing Statistics Data with Correct Dates...\n");

    // Login as admin
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "keroles", password: "keroles123" }),
    });
    const {
      data: { token },
    } = await loginResponse.json();

    // Get exact Friday dates that the API uses
    console.log("📅 Calculating Friday dates using backend logic...");
    const fridayDates = getFridayDatesBack(4);

    console.log("\n🎯 These are the exact dates the API expects:");
    fridayDates.forEach((date, index) => {
      console.log(`   ${index + 1}. ${date}`);
    });

    // Get all children and servants
    console.log("\n👶 Getting children and servants...");
    const [childrenResponse, servantsResponse] = await Promise.all([
      fetch("http://localhost:5000/api/children", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("http://localhost:5000/api/servants", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const childrenData = await childrenResponse.json();
    const servantsData = await servantsResponse.json();
    const children = childrenData.data;
    const servants = servantsData.data;

    console.log(
      `📊 Found ${children.length} children and ${servants.length} servants`
    );

    // Add realistic attendance for each Friday
    console.log("\n🎯 Adding attendance data for exact API dates...");

    let totalChildrenAdded = 0;
    let totalServantsAdded = 0;

    for (const friday of fridayDates) {
      console.log(`\n📅 Processing ${friday}:`);

      // Children attendance (70-90% present)
      const shuffledChildren = [...children].sort(() => Math.random() - 0.5);
      const childrenPresentCount = Math.floor(
        children.length * (0.7 + Math.random() * 0.2)
      );
      const presentChildren = shuffledChildren.slice(0, childrenPresentCount);
      const absentChildren = shuffledChildren.slice(childrenPresentCount);

      console.log(
        `   👶 Children: ${childrenPresentCount} present, ${
          children.length - childrenPresentCount
        } absent/not recorded`
      );

      // Add present children
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
              notes: `إصلاح التواريخ - حضور ${friday}`,
            }),
          });

          if (response.ok) {
            totalChildrenAdded++;
          }
        } catch (error) {
          console.log(`     ❌ ${child.name}: ${error.message}`);
        }
      }

      // Add some explicit absent records (only for 2-3 children)
      for (const child of absentChildren.slice(0, 2)) {
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
              notes: `إصلاح التواريخ - غياب ${friday}`,
            }),
          });
        } catch (error) {
          // Ignore errors for absent records
        }
      }

      // Servants attendance (80-95% present)
      const shuffledServants = [...servants].sort(() => Math.random() - 0.5);
      const servantsPresentCount = Math.floor(
        servants.length * (0.8 + Math.random() * 0.15)
      );
      const presentServants = shuffledServants.slice(0, servantsPresentCount);

      console.log(
        `   👥 Servants: ${servantsPresentCount} present, ${
          servants.length - servantsPresentCount
        } absent/not recorded`
      );

      // Add present servants
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
                notes: `إصلاح التواريخ - حضور ${friday}`,
              }),
            }
          );

          if (response.ok) {
            totalServantsAdded++;
          }
        } catch (error) {
          console.log(`     ❌ ${servant.name}: ${error.message}`);
        }
      }
    }

    console.log(`\n🎉 Added ${totalChildrenAdded} children attendance records`);
    console.log(`🎉 Added ${totalServantsAdded} servants attendance records`);

    // Test the results immediately
    console.log("\n🧪 Testing results...");

    const testResponse = await fetch(
      "http://localhost:5000/api/statistics/attendance?days=7",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const testData = await testResponse.json();

    console.log("\n📊 Final Results:");
    if (testData.success && testData.data.daily) {
      console.log(
        `   API returned ${testData.data.daily.length} days of data:`
      );
      testData.data.daily.forEach((day, index) => {
        console.log(
          `     ${index + 1}. ${day.date}: ${day.present} present, ${
            day.absent
          } absent`
        );
      });

      const totalPresent = testData.data.daily.reduce(
        (sum, day) => sum + day.present,
        0
      );
      console.log(`\n   ✅ Total attendance: ${totalPresent} records`);

      if (totalPresent > 0) {
        console.log("   🎉 SUCCESS! Statistics should now work properly!");
        console.log("   📱 Refresh the app to see updated charts and numbers");
      } else {
        console.log("   ⚠️  Still showing zeros - may need backend restart");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

fixDatesProperly();
