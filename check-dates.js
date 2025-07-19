const fetch = require("node-fetch");

async function checkDates() {
  try {
    console.log("📅 Checking Date Issues...\n");

    // Login
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "keroles", password: "keroles123" }),
    });
    const {
      data: { token },
    } = await loginResponse.json();

    // Check what Friday dates the API is using
    console.log("🔍 Checking API dates...");
    const apiResponse = await fetch(
      "http://localhost:5000/api/statistics/attendance?days=7",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const apiData = await apiResponse.json();

    console.log("📊 API is looking for these dates:");
    if (apiData.success && apiData.data.daily) {
      apiData.data.daily.forEach((day, index) => {
        console.log(
          `   ${index + 1}. ${day.date} - Present: ${day.present}, Absent: ${
            day.absent
          }`
        );
      });
    }

    // Check what dates we actually have attendance records for
    console.log("\n🗄️  Checking actual attendance records...");

    // Get recent attendance records for children
    const attendanceResponse = await fetch(
      "http://localhost:5000/api/attendance",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const attendanceData = await attendanceResponse.json();

    if (attendanceData.success && attendanceData.data) {
      const records = attendanceData.data;
      console.log(`📝 Found ${records.length} total attendance records`);

      // Group by date
      const dateGroups = {};
      records.forEach((record) => {
        const date = record.date.split("T")[0];
        if (!dateGroups[date]) {
          dateGroups[date] = { present: 0, absent: 0, total: 0 };
        }
        if (record.status === "present") dateGroups[date].present++;
        if (record.status === "absent") dateGroups[date].absent++;
        dateGroups[date].total++;
      });

      console.log("\n📊 Actual attendance records by date:");
      const sortedDates = Object.keys(dateGroups).sort().reverse();
      sortedDates.slice(0, 6).forEach((date) => {
        const group = dateGroups[date];
        console.log(
          `   ${date}: ${group.present} present, ${group.absent} absent (${group.total} total)`
        );
      });
    }

    // Calculate correct Friday dates
    console.log("\n📅 Calculating correct Friday dates...");
    const today = new Date();
    console.log(
      "Today is:",
      today.toISOString().split("T")[0],
      `(${today.toLocaleDateString("en", { weekday: "long" })})`
    );

    const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
    console.log("Day of week (0=Sun, 5=Fri):", dayOfWeek);

    let daysAgo =
      dayOfWeek === 5 ? 0 : dayOfWeek > 5 ? dayOfWeek - 5 : dayOfWeek + 2;
    console.log("Days ago to last Friday:", daysAgo);

    const fridayDates = [];
    for (let i = 0; i < 4; i++) {
      const friday = new Date();
      friday.setDate(today.getDate() - daysAgo - i * 7);
      fridayDates.push(friday.toISOString().split("T")[0]);
    }

    console.log("Expected Friday dates:", fridayDates);

    // Check if our dates match API dates
    console.log("\n🔍 Date matching analysis:");
    if (apiData.success && apiData.data.daily) {
      const apiDates = apiData.data.daily.map((d) => d.date);

      apiDates.forEach((apiDate, index) => {
        const hasOurData = fridayDates.includes(apiDate);
        const hasAttendance = dateGroups[apiDate];
        console.log(`   API Date ${index + 1}: ${apiDate}`);
        console.log(
          `     - Matches our expected dates: ${hasOurData ? "✅" : "❌"}`
        );
        console.log(
          `     - Has attendance records: ${hasAttendance ? "✅" : "❌"}`
        );
        if (hasAttendance) {
          console.log(
            `     - Records: ${hasAttendance.present} present, ${hasAttendance.absent} absent`
          );
        }
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkDates();
