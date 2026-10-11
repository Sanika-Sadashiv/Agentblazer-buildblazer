require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const connectDB = require("../config/db");

async function createAdmin() {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first");
    }

    const existing = await Admin.findOne({ email: email.toLowerCase() });

    if (existing) {
      console.log("Admin already exists:", email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await Admin.create({
      name: "AgentBlazer Admin",
      email: email.toLowerCase(),
      password: hashedPassword
    });

    console.log("Admin created:", email);
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
}

createAdmin();
