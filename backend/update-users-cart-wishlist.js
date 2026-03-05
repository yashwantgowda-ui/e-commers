// Script to add cart and wishlist fields to existing users
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const userSchema = new mongoose.Schema({
  fullName: String,
  phoneNumber: String,
  email: String,
  password: String,
  cart: { type: Array, default: [] },
  wishlist: { type: Array, default: [] },
}, { strict: false });

const User = mongoose.model("User", userSchema, "users");

async function updateUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    let updated = 0;
    for (const user of users) {
      const needsUpdate = !user.cart || !user.wishlist;
      if (needsUpdate) {
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              cart: user.cart || [],
              wishlist: user.wishlist || [],
            },
          }
        );
        updated++;
        console.log(`✅ Updated user: ${user.email}`);
      }
    }

    console.log(`\n✅ Done! Updated ${updated} users`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateUsers();
