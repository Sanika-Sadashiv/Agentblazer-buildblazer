require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const TeamMember = require("../models/TeamMember");

(async () => {
  await connectDB();
  const members = await TeamMember.find({}).sort({ section: 1, order: 1 });

  console.log(`\nFound ${members.length} total document(s):\n`);
  members.forEach((m) => {
    console.log(
      `order=${m.order}  active=${JSON.stringify(m.active)}  section=${JSON.stringify(m.section)}  name=${JSON.stringify(m.name)}`
    );
  });

  await mongoose.disconnect();
})();