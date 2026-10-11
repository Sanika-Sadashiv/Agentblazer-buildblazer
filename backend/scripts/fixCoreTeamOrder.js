// One-time fix so the "Student Core Team" (section: "core") list is ordered
// exactly as intended. This version fetches every document with no filter,
// then filters/sorts in plain JavaScript, to avoid any inconsistency in
// server-side query filtering.
//
// Run once from the backend folder:   node scripts/fixCoreTeamOrder.js

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const TeamMember = require("../models/TeamMember");

const FIXED_ORDER = [
  "ruben saldanha",
  "ajay preenal dsouza",
  "stevin dsouza",
  "frenny chrystal saldanha",
  "joyline galbao",
  "chinthan n v",
];

(async () => {
  await connectDB();

  // Fetch EVERYTHING, no filter — then filter in JS, to rule out any
  // query-level inconsistency.
  const all = await TeamMember.find({});
  console.log(`Fetched ${all.length} total document(s) from the database.`);

  const normalize = (s) => String(s || "").trim().toLowerCase();

  const members = all.filter(
    (m) => m.active === true && normalize(m.section) === "core"
  );
  console.log(`Of those, ${members.length} are active core members:`);
  members.forEach((m) => console.log(`  - ${m.name} (current order: ${m.order}, _id: ${m._id})`));
  console.log("");

  const byName = new Map(members.map((m) => [normalize(m.name), m]));

  const bulkOps = [];
  let position = 1;

  for (const name of FIXED_ORDER) {
    const member = byName.get(name);
    if (!member) {
      console.log(`Skipping "${name}" — not found among active core members`);
      continue;
    }
    if (member.order !== position) {
      bulkOps.push({
        updateOne: { filter: { _id: member._id }, update: { $set: { order: position } } },
      });
    }
    console.log(`${position}. ${member.name}`);
    byName.delete(name);
    position++;
  }

  const rest = Array.from(byName.values()).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return String(a.name).localeCompare(String(b.name));
  });

  for (const member of rest) {
    if (member.order !== position) {
      bulkOps.push({
        updateOne: { filter: { _id: member._id }, update: { $set: { order: position } } },
      });
    }
    console.log(`${position}. ${member.name}`);
    position++;
  }

  if (bulkOps.length) {
    await TeamMember.bulkWrite(bulkOps);
    console.log(`\nUpdated ${bulkOps.length} member(s).`);
  } else {
    console.log("\nEverything was already in the right order — no changes made.");
  }

  await mongoose.disconnect();
  console.log("Done.");
})().catch((err) => {
  console.error("Fix failed:", err);
  process.exit(1);
});