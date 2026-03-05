/**
 * Script to create test data in the ecomm database
 * This will create the database if it doesn't exist
 * Run: node create-test-data.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ecomm";

async function createTestData() {
  try {
    console.log("Connecting to MongoDB...");
    console.log("URI:", MONGO_URI);
    
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
    
    const dbName = mongoose.connection.db.databaseName;
    console.log("📊 Database:", dbName);
    
    // Create a test user
    const testUser = new User({
      fullName: "Test User",
      email: "test@example.com",
      password: await bcrypt.hash("test123", 10),
      phoneNumber: "1234567890",
    });
    
    await testUser.save();
    console.log("✅ Test user created:", testUser.email);
    
    // Count users
    const count = await User.countDocuments();
    console.log(`📈 Total users in '${dbName}' database: ${count}`);
    
    // List all users
    const users = await User.find().select("-password");
    console.log("\n👥 Users in database:");
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.fullName} (${user.email})`);
    });
    
    console.log("\n✅ Database 'ecomm' should now be visible in MongoDB Compass!");
    console.log("   Database: ecomm");
    console.log("   Collection: users");
    
    await mongoose.connection.close();
    console.log("\n✅ Connection closed");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createTestData();
