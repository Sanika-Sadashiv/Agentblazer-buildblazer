require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const TeamMember = require("../models/TeamMember");

const COMMITTEE_SEED = [
  { name: "Prajwal Royston Cordiero", role: "AI & LLM Research Group", section: "committee", order: 1 },
  { name: "Chacko P Abraham", role: "Model Evaluation Benchmarks", section: "committee", order: 2 },
  { name: "Alma Roxane Pereira", role: "Project Operations & Labs", section: "committee", order: 3 }
];

(async () => {
  await connectDB();
  for (const m of COMMITTEE_SEED) {
    const exists = await TeamMember.findOne({ name: m.name, section: "committee" });
    if (exists) {
      console.log(`Skipping "${m.name}" — already exists`);
      continue;
    }
    await TeamMember.create(m);
    console.log(`Added "${m.name}"`);
  }
  await mongoose.disconnect();
  console.log("Done.");
})();