require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const TeamMember = require("../models/TeamMember");

(async () => {
  await connectDB();
  const members = await TeamMember.find({ active: true, section: "core" }).sort({ order: 1, name: 1 });

  console.log(`\nFound ${members.length} active core member(s):\n`);
  members.forEach((m) => {
    // JSON.stringify shows hidden characters (extra spaces, curly apostrophes, etc.) that plain console.log hides
    console.log(`order=${m.order}  name=${JSON.stringify(m.name)}`);
  });

  await mongoose.disconnect();
})();