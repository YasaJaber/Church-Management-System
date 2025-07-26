// Test script to simulate exactly what the frontend does
// This will help us debug the frontend API connection

const axios = require("axios");

// Simulate the frontend API configuration
const BASE_URL = "http://192.168.1.4:5000/api"; // Same as frontend

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Simulate AsyncStorage token
let simulatedToken = null;

// Simulate the frontend request interceptor
api.interceptors.request.use(
  async (config) => {
    console.log("🔧 Request Interceptor:");
    console.log("  - Token from storage:", simulatedToken ? "EXISTS" : "NOT_FOUND");
    console.log("  - Making request to:", config.baseURL + config.url);
    if (simulatedToken) {
      config.headers.Authorization = "Bearer " + simulatedToken;
      console.log("  - Token added to request");
    } else {
      console.log("  - No token found");
    }
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Simulate the frontend response interceptor
api.interceptors.response.use(
  (response) => {
    console.log("✅ Response received:", response.status, response.statusText);
    return response;
  },
  (error) => {
    console.error("❌ Response error:", error.response?.status, error.response?.statusText);
    console.error("❌ Error data:", error.response?.data);
    return Promise.reject(error);
  }
);

// Simulate the exact pastoralCareAPI.getAbsentChildren function
const simulatePastoralCareAPI = {
  getAbsentChildren: async () => {
    try {
      console.log("📋 Getting absent children for pastoral care...");
      const response = await api.get("/pastoral-care/absent-children");
      console.log("📋 Full pastoral care response:", response.data);
      
      // Return exactly what the frontend API returns after our fix
      return response.data;
    } catch (error) {
      console.error("❌ Error getting absent children:", error);
      return {
        success: false,
        error: error.response?.data?.error || "حدث خطأ في جلب قائمة الافتقاد",
      };
    }
  },
};

async function testFrontendSimulation() {
  try {
    console.log("🎭 Simulating Frontend API Call...");
    console.log("🌐 Using base URL:", BASE_URL);
    
    // Step 1: Login to get token (simulate auth)
    console.log("\n🔐 Step 1: Authentication");
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: "test_pastoral",
      password: "test123"
    });
    
    if (!loginResponse.data.success) {
      console.log("❌ Login failed:", loginResponse.data.error);
      return;
    }
    
    simulatedToken = loginResponse.data.data?.token || loginResponse.data.token;
    console.log("✅ Login successful, token stored");
    
    // Step 2: Call pastoral care API (simulate frontend call)
    console.log("\n📋 Step 2: Calling Pastoral Care API");
    const result = await simulatePastoralCareAPI.getAbsentChildren();
    
    console.log("\n🔍 Simulation Results:");
    console.log("Success:", result.success);
    
    if (result.success) {
      console.log("Date:", result.date);
      console.log("Total Absent:", result.totalAbsent);
      console.log("Children Array Length:", result.data?.length || 0);
      console.log("Message:", result.message);
      
      if (result.data && result.data.length > 0) {
        console.log("\n👶 Children Found:");
        result.data.forEach((child, index) => {
          console.log(`   ${index + 1}. ${child.name} (${child.className})`);
          console.log(`      ID: ${child._id}`);
          console.log(`      Phone: ${child.phone || 'No phone'}`);
        });
        
        console.log("\n✅ FRONTEND SHOULD DISPLAY THESE CHILDREN!");
      } else {
        console.log("\n❌ NO CHILDREN IN RESPONSE DATA");
      }
    } else {
      console.log("❌ API call failed:", result.error);
    }
    
  } catch (error) {
    console.error("❌ Simulation error:", error.message);
  }
}

// Also test network connectivity
async function testNetworkConnectivity() {
  try {
    console.log("\n🌐 Testing Network Connectivity...");
    
    // Test server health
    const healthCheck = await axios.get("http://192.168.1.4:5000/");
    console.log("✅ Server is reachable");
    
    // Test if route exists
    try {
      await axios.get(`${BASE_URL}/pastoral-care/absent-children`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("✅ Route exists (401 = needs auth, which is expected)");
      } else {
        console.log("❌ Route issue:", error.response?.status);
      }
    }
    
  } catch (error) {
    console.log("❌ Network connectivity issue:", error.message);
    console.log("💡 Frontend might not be able to reach the server!");
  }
}

async function runFullTest() {
  await testNetworkConnectivity();
  await testFrontendSimulation();
}

runFullTest();
