// One-time script to copy the "Honored Guests" and "Faculty Advisory Council"
// people that used to be hardcoded on the frontend into the database, so they
// show up in the admin panel and can be edited/removed from there.
//
// Run once from the backend folder:   node seedLeadership.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const connectDB = require("./config/db");
const LeadershipMember = require("./models/LeadershipMember");

// Reads an image off disk and turns it into a base64 data URL, the same
// format the admin's photo uploader produces.
function photoDataUrl(relativePath) {
  const filePath = path.join(__dirname, relativePath);
  const ext = path.extname(filePath).slice(1) || "jpeg";
  const data = fs.readFileSync(filePath).toString("base64");
  return `data:image/${ext};base64,${data}`;
}

const GUESTS = [
  { kind: "guest", order: 1, name: "Mr. Santosh Rebello", org: "Salesforce", label: "Guest of Honor", highlight: "Keynote Speaker", highlightColor: "c-gold", accentColor: "c-cy" },
  { kind: "guest", order: 2, name: "Mr. Stephen Pinto", org: "Salesforce & SJEC Alumnus", label: "Technical Mentor", highlight: "Alumni Guide", highlightColor: "c-cy", accentColor: "c-cy" },
  { kind: "guest", order: 3, name: "Dr. Rio D’Souza", org: "Principal, SJEC", label: "Presidential Address", highlight: "Patron", highlightColor: "c-pu", accentColor: "p" },
  { kind: "guest", order: 4, name: "Dr. Melwyn D’Souza", org: "HOD, Computer Science & Engg", label: "Program Chair", highlight: "Department Head", highlightColor: "c-pu", accentColor: "p" },
];

// Adjust these two paths if your photos live somewhere else — they should
// point at the same images the old frontend fallback used
// (frontend/src/assets/nisha.jpg and frontend/src/assets/keith.jpg).
const FACULTY = [
  {
    kind: "faculty", order: 1, name: "Ms. Nisha Roche",
    role: "Assistant Professor, CSE • Faculty Coordinator",
    bio: "Faculty Coordinator • AgentBlazer Club",
    photo: photoDataUrl("../frontend/src/assets/nisha.jpg"),
  },
  {
    kind: "faculty", order: 2, name: "Mr. Keith Fernandes",
    role: "Assistant Professor, CSE • Faculty Coordinator",
    bio: "Faculty Coordinator • AgentBlazer Club",
    photo: photoDataUrl("../frontend/src/assets/keith.jpg"),
  },
];

async function run() {
  await connectDB();
  const existing = await LeadershipMember.countDocuments();
  if (existing > 0) {
    console.log(`LeadershipMember already has ${existing} document(s) — skipping seed so nothing is duplicated.`);
    process.exit(0);
  }
  await LeadershipMember.insertMany([...GUESTS, ...FACULTY]);
  console.log(`Seeded ${GUESTS.length} guests and ${FACULTY.length} faculty members.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});