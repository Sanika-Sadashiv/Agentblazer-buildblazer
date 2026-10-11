require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const TeamMember = require("../models/TeamMember");

(async () => {
  await connectDB();
  for (const section of ["core", "committee"]) {
    const members = await TeamMember.find({ active: true, section }).sort({ order: 1, name: 1 });
    for (let i = 0; i < members.length; i++) {
      const correctOrder = i + 1;
      if (members[i].order !== correctOrder) {
        members[i].order = correctOrder;
        await members[i].save();
        console.log(`${section}: "${members[i].name}" -> order ${correctOrder}`);
      }
    }
  }
  await mongoose.disconnect();
  console.log("Done.");
})();