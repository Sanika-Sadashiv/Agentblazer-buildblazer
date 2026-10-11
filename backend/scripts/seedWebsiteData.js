// One-time script: copies the content that was hard-coded in
// frontend/src/data.js (Events + Student Core Team) into MongoDB, so it
// shows up in the admin dashboard and can be edited/deleted there.
//
// Safe to re-run: anything that already exists (same title / same name)
// is skipped, so nothing is duplicated.
//
// Run from the backend folder:   node scripts/seedWebsiteData.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Event = require("../models/Event");
const TeamMember = require("../models/TeamMember");

const ASSETS = path.join(__dirname, "../../frontend/src/assets");

function img(file) {
  const p = path.join(ASSETS, file);
  if (!fs.existsSync(p)) {
    console.warn(`  ! image not found, skipping: ${file}`);
    return null;
  }
  const ext = path.extname(p).slice(1).toLowerCase().replace("jpg", "jpeg");
  return `data:image/${ext};base64,${fs.readFileSync(p).toString("base64")}`;
}
const imgs = (files) => files.map(img).filter(Boolean);

const EVENTS = [
  {
    date: "February 14, 2026", category: "Flagship Masterclass",
    title: "Master the Future: A Hands-on GSoC & LLMs Workshop",
    description: "Practical masterclass on open-source Git PR workflows, Retrieval-Augmented Generation (RAG), Gemini AI, LangChain, LlamaIndex, CrewAI, and live Gradio prototyping.",
    speaker: "Anas Khan • Software Development Engineer, HackerRank",
    shortlistedStudents: 80,
    gallery: imgs(["LLM.jpg", "LLM1.jpg", "LLM2.jpg", "LLM3.jpg", "LLM4.jpg", "LLM5.jpg", "LLM6.jpg"])
  },
  {
    date: "March 25, 2026", category: "Live Contest",
    title: "PROMPT OPS-2K26 Challenge",
    track: "Track 1: 1st Year Engineers | Track 2: 2nd Year Engineers",
    description: "Fast-paced prompt engineering hackathon featuring automated test suites, iterative refinement, teamwork, and live algorithmic problem solving.",
    speaker: "Track 1 & Track 2 • Live contest moments",
    gallery: imgs(["PromptOS.jpg", "PromptOS1.jpg", "PromptOS2.jpg", "PromptOS3.jpg", "PromptOS4.jpg"])
  },
  {
    date: "August 25, 2025", category: "Symposium Keynote",
    title: "Agentforce Technical Deep-Dive",
    description: "Guiding undergraduate engineers from prompt prediction to autonomous agentic architectures, Salesforce Data Cloud integration, and real-time enterprise workflows.",
    venue: "CSE Auditorium"
  },
  {
    date: "March 18, 2026", category: "Student Lab",
    title: "Demystifying Generative Models",
    description: "Exploring Transformer mechanics, multi-agent consensus networks, and comparative latency benchmarks across open and hosted language models.",
    speaker: "Session Leads: Prajwal Royston Cordiero & Chacko P Abraham",
    venue: "CSE Labs"
  },
  {
    date: "April 01, 2026", category: "Security Workshop",
    title: "Cyber Security & Career Pathways",
    description: "Interactive demonstrations covering Shodan discovery, OSINT methods, CVE vulnerability analysis, SQL injection scenarios, and the Cyber Kill Chain.",
    speaker: "Suhas Nayak • Tech Lead, SecOps, Ingersoll Rand",
    gallery: imgs(["cybersecurity.jpg", "cybersecurity1.jpg", "cybersecurity2.jpg", "cybersecurity3.jpg", "cybersecurity4.jpg"])
  },
  {
    date: "May 22, 2026", category: "Developer Lab",
    title: "Hands-on Agentforce & AI Agents",
    description: "Applied development lab creating Flex Prompts, dynamic contextual Sales Email templates, and autonomous agent actions inside Salesforce orgs.",
    venue: "Salesforce Developer Sandbox"
  }
];

const CORE_TEAM = [
  { name: "Ruben Saldanha", role: "President", department: "Executive President", photo: "ruben.jpg", description: "Guiding club vision, university collaborations, and strategic workshop series." },
  { name: "Ajay Preenal Dsouza", role: "Vice President", department: "Executive Vice President", photo: "ajay.jpg", description: "Coordinating student mentorship, event operations, and community growth." },
  { name: "Stevin Dsouza", role: "Tech Lead", department: "Technical Direction", photo: "stevin.jpg", description: "Technical architectures, hands-on lab environments, and repository supervision." },
  { name: "Frenny Chrystal Saldanha", role: "Resource Head", department: "Operations & Logistics", photo: "frenny.jpg", description: "Managing cloud compute budgets, venue infrastructure, and participant toolkits." },
  { name: "Joyline Galbao", role: "Secretary", department: "Administration", photo: "joyline.jpg", description: "Documentation, accreditation reporting, meeting minutes, and member onboarding." },
  { name: "Chinthan N V", role: "Media Head", department: "Creative Outreach", photo: "chinthan.jpg", description: "Brand storytelling, photo documentation, visual design, and social publications." }
];

const COMMITTEE = [
  { name: "Prajwal Royston Cordiero", role: "AI & LLM Research Group" },
  { name: "Chacko P Abraham", role: "Model Evaluation Benchmarks" },
  { name: "Alma Roxane Pereira", role: "Project Operations & Labs" }
];

async function run() {
  await connectDB();
  console.log(`Connected to database: ${mongoose.connection.name}\n`);

  // ---- events (oldest-created first, because the site sorts by createdAt)
  let t = Date.now() - EVENTS.length * 1000;
  for (const e of EVENTS) {
    if (await Event.findOne({ title: e.title })) { console.log(`Event exists, skipped: ${e.title}`); t += 1000; continue; }
    await Event.create({ ...e, galleryCount: 0, createdAt: new Date(t), updatedAt: new Date(t) });
    console.log(`Event added: ${e.title}  (${(e.gallery || []).length} photos)`);
    t += 1000;
  }

  // ---- core team + committee
  const seedTeam = async (list, section) => {
    let order = 1;
    for (const m of list) {
      const exists = await TeamMember.findOne({ name: m.name, section });
      if (exists) { console.log(`${section} member exists, skipped: ${m.name}`); order++; continue; }
      const { photo, ...rest } = m;
      await TeamMember.create({ ...rest, image: photo ? img(photo) || "" : "", section, order, active: true });
      console.log(`${section} member added: ${m.name}`);
      order++;
    }
  };
  await seedTeam(CORE_TEAM, "core");
  await seedTeam(COMMITTEE, "committee");

  const counts = {
    events: await Event.countDocuments(),
    team: await TeamMember.countDocuments({ active: true })
  };
  console.log("\nDone. MongoDB now has:", counts);
  console.log("Guests & Faculty are seeded separately:  node seedLeadership.js");
  await mongoose.disconnect();
}

run().catch((err) => { console.error("Seed failed:", err.message); process.exit(1); });
