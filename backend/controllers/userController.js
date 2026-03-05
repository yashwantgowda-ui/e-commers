const User = require("../models/User");

// Add User
exports.addUser = async (req, res) => {
  try {
    const { fullName, phoneNumber, email } = req.body;

    if (!fullName || !phoneNumber || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newUser = new User({
      fullName,
      phoneNumber,
      email,
    });

    await newUser.save();

    res.status(201).json({
      message: "User saved successfully",
      user: newUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};