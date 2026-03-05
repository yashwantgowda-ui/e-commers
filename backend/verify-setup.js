/**
 * Verification script - checks if backend is set up correctly
 * Run: node verify-setup.js
 */
const http = require("http");

const BASE_URL = "http://localhost:5000";
const endpoints = [
  { method: "GET", path: "/", name: "Root" },
  { method: "GET", path: "/api", name: "API Info" },
  { method: "GET", path: "/api/test", name: "Test" },
  { method: "GET", path: "/api/users", name: "Users List" },
];

console.log("🔍 Verifying backend setup...\n");

let checked = 0;
let passed = 0;
let failed = 0;

function testEndpoint(method, path, name) {
  return new Promise((resolve) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path: path,
      method: method,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (ch) => (data += ch));
      res.on("end", () => {
        checked++;
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ ${name} (${method} ${path}) - Status: ${res.statusCode}`);
          passed++;
        } else {
          console.log(`❌ ${name} (${method} ${path}) - Status: ${res.statusCode}`);
          console.log(`   Response: ${data.substring(0, 100)}`);
          failed++;
        }
        if (checked === endpoints.length) {
          console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${checked} tests`);
          if (failed === 0) {
            console.log("🎉 All endpoints working! Your backend is ready.");
          } else {
            console.log("⚠️  Some endpoints failed. Make sure the server is running:");
            console.log("   cd backend && npm start");
          }
        }
        resolve();
      });
    });

    req.on("error", (err) => {
      checked++;
      failed++;
      console.log(`❌ ${name} (${method} ${path}) - Error: ${err.message}`);
      if (checked === endpoints.length) {
        console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${checked} tests`);
        console.log("❌ Cannot connect to backend. Is it running?");
        console.log("   Start it with: cd backend && npm start");
      }
      resolve();
    });

    req.end();
  });
}

// Test all endpoints
(async () => {
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.method, endpoint.path, endpoint.name);
  }
})();
