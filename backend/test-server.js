/**
 * Quick test: start the server and request /api/test
 * Run from backend folder: node test-server.js
 * Or: node backend/test-server.js from project root
 */
const http = require("http");

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/test",
  method: "GET",
};

console.log("Requesting http://localhost:5000/api/test ...");

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (ch) => (data += ch));
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data);
    if (res.statusCode === 200 && data.includes("Backend is working")) {
      console.log("\n✅ Backend is responding correctly!");
    } else {
      console.log("\n❌ Unexpected response. Is the backend running from backend/index.js?");
    }
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on("error", (err) => {
  console.error("Error:", err.message);
  console.log("\n❌ Cannot reach http://localhost:8080");
  console.log("   Start the backend first: cd backend && npm start");
  process.exit(1);
});

req.end();
