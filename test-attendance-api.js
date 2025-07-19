const fetch = require("node-fetch");

async function testAttendanceAPI() {
  try {
    console.log("🔍 Testing Attendance API Directly...\n");

    // Login
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "keroles", password: "keroles123" }),
    });
    const {
      data: { token },
    } = await loginResponse.json();

    // Test the statistics/attendance API directly
    console.log("📊 Testing /api/statistics/attendance?days=7...");
    const apiResponse = await fetch(
      "http://localhost:5000/api/statistics/attendance?days=7",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const apiData = await apiResponse.json();

    console.log("📊 Statistics API Response:");
    console.log("   Success:", apiData.success);
    console.log("   Total Records:", apiData.data?.totalRecords || 0);
    console.log("   Present Count:", apiData.data?.presentCount || 0);
    console.log("   Absent Count:", apiData.data?.absentCount || 0);
    console.log("   Daily Data Length:", apiData.data?.daily?.length || 0);

    if (apiData.data?.daily && apiData.data.daily.length > 0) {
      console.log("\n📈 Daily breakdown:");
      apiData.data.daily.forEach((day, index) => {
        console.log(
          `     ${index + 1}. ${day.date}: ${day.present} present, ${
            day.absent
          } absent`
        );
      });
    } else {
      console.log("\n❌ No daily data returned!");
    }

    if (apiData.data?.records && apiData.data.records.length > 0) {
      console.log("\n📝 Sample raw records:");
      apiData.data.records.slice(0, 3).forEach((record, index) => {
        console.log(
          `     ${index + 1}. Person: ${
            record.person?.name || "NO NAME"
          }, Status: ${record.status}, Date: ${record.date}`
        );
        console.log(
          `         Type: ${record.type}, PersonModel: ${record.personModel}`
        );
        console.log(
          `         Has Class: ${!!record.person?.class}, Class: ${
            record.person?.class?.stage || "NO CLASS"
          }`
        );
      });
    } else {
      console.log("\n❌ No raw records found!");
    }

    // Let's also test a specific date
    console.log("\n📅 Testing specific date: 2025-07-17...");
    const specificResponse = await fetch(
      "http://localhost:5000/api/attendance/children?date=2025-07-17",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const specificData = await specificResponse.json();

    console.log("📋 Specific date response:");
    console.log("   Success:", specificData.success);
    console.log("   Records found:", specificData.data?.length || 0);

    if (specificData.data && specificData.data.length > 0) {
      console.log("\n👶 Sample children records for 2025-07-17:");
      specificData.data.slice(0, 3).forEach((record, index) => {
        console.log(
          `     ${index + 1}. ${record.child?.name}: ${record.status}`
        );
      });
    }

    // Compare with what statistics API finds
    console.log("\n🔍 DIAGNOSIS:");
    console.log(
      `   Children on specific date: ${specificData.data?.length || 0}`
    );
    console.log(
      `   Statistics API total records: ${apiData.data?.totalRecords || 0}`
    );
    console.log(
      `   Statistics API present: ${apiData.data?.presentCount || 0}`
    );

    if (
      specificData.data?.length > 0 &&
      (apiData.data?.totalRecords || 0) === 0
    ) {
      console.log(
        "\n❌ PROBLEM: Children data exists but statistics API not finding it!"
      );
      console.log("   Possible causes:");
      console.log('   1. Type field mismatch (should be "child")');
      console.log("   2. PersonModel field issue");
      console.log("   3. Date filtering problem");
      console.log("   4. Populate/filtering logic issue");
    } else if (
      (apiData.data?.totalRecords || 0) > 0 &&
      (apiData.data?.presentCount || 0) === 0
    ) {
      console.log("\n⚠️  Records found but all showing as absent/other status");
    } else {
      console.log("\n✅ Data consistency looks good");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testAttendanceAPI();
