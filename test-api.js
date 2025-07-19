const fetch = require("node-fetch");

async function testFollowUpAPI() {
  try {
    // 1. Login
    console.log("🔐 Logging in...");
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "keroles",
        password: "keroles123",
      }),
    });

    const loginData = await loginResponse.json();
    console.log("✅ Login successful:", loginData.success);
    console.log("👤 User:", loginData.data.user.name);

    const token = loginData.data.token;

    // 2. Test Follow-up API
    console.log("\n🔍 Testing Follow-up API...");
    const followUpResponse = await fetch(
      "http://localhost:5000/api/attendance/follow-up",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const followUpData = await followUpResponse.json();
    console.log("✅ Follow-up API Response:");
    console.log(JSON.stringify(followUpData, null, 2));
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testFollowUpAPI();
