/* ---------- team photo imports ---------- */
import rubenPhoto from "./assets/ruben.jpg";
import ajayPhoto from "./assets/ajay.jpg";
import stevinPhoto from "./assets/stevin.jpg";
import frennyPhoto from "./assets/frenny.jpg";
import joylinePhoto from "./assets/joyline.jpg";
import chinthanPhoto from "./assets/chinthan.jpg";

/* ---------- faculty photo imports ---------- */
import nishaPhoto from "./assets/nisha.jpg";
import keithPhoto from "./assets/keith.jpg";

/* ---------- event gallery photo imports ---------- */
// Master the Future: GSoC & LLMs Workshop
import gsoc0 from "./assets/LLM.jpg";
import gsoc1 from "./assets/LLM1.jpg";
import gsoc2 from "./assets/LLM2.jpg";
import gsoc3 from "./assets/LLM3.jpg";
import gsoc4 from "./assets/LLM4.jpg";
import gsoc5 from "./assets/LLM5.jpg";
import gsoc6 from "./assets/LLM6.jpg";
// PROMPT OPS-2K26 Challenge
import prompt0 from "./assets/PromptOS.jpg";
import prompt1 from "./assets/PromptOS1.jpg";
import prompt2 from "./assets/PromptOS2.jpg";
import prompt3 from "./assets/PromptOS3.jpg";
import prompt4 from "./assets/PromptOS4.jpg";
// Cyber Security & Career Pathways
import cyber0 from "./assets/cybersecurity.jpg";
import cyber1 from "./assets/cybersecurity1.jpg";
import cyber2 from "./assets/cybersecurity2.jpg";
import cyber3 from "./assets/cybersecurity3.jpg";
import cyber4 from "./assets/cybersecurity4.jpg";

/* Team photos by key. Add more here (import the file, then add a key)
   and set `photo: "key"` on that person in TEAM. */
export const PHOTOS = {
  ruben: rubenPhoto,
  ajay: ajayPhoto,
  stevin: stevinPhoto,
  frenny: frennyPhoto,
  joyline: joylinePhoto,
  chinthan: chinthanPhoto,
  nisha: nishaPhoto,
  keith: keithPhoto,
};

export const CORE_TEAM_PHOTO_KEYS = {
  "ruben saldanha": "ruben",
  "ajay preenal dsouza": "ajay",
  "stevin dsouza": "stevin",
  "frenny chrystal saldanha": "frenny",
  "joyline galbao": "joyline",
  "chinthan n v": "chinthan",
};
/* ---------- data ---------- */
export const GUESTS = [
  { ini: "SR", name: "Mr. Santosh Rebello", org: "Salesforce", l: "Guest of Honor", r: "Keynote Speaker", rc: "c-gold", ac: "c-cy" },
  { ini: "SP", name: "Mr. Stephen Pinto", org: "Salesforce & SJEC Alumnus", l: "Technical Mentor", r: "Alumni Guide", rc: "c-cy", ac: "c-cy" },
  { ini: "RD", name: "Dr. Rio D’Souza", org: "Principal, SJEC", l: "Presidential Address", r: "Patron", rc: "c-pu", ac: "p" },
  { ini: "MD", name: "Dr. Melwyn D’Souza", org: "HOD, Computer Science & Engg", l: "Program Chair", r: "Department Head", rc: "c-pu", ac: "p" },
];

export const FACULTY = [
  { ini: "NR", photo: "nisha", hue: 320, name: "Ms. Nisha Roche", role: "Assistant Professor, CSE • Faculty Coordinator", pop: "Faculty Coordinator • AgentBlazer Club" },
  { ini: "KF", photo: "keith", hue: 200, name: "Mr. Keith Fernandes", role: "Assistant Professor, CSE • Faculty Coordinator", portrait: true, pop: "Faculty Coordinator • AgentBlazer Club" },
];

export const TEAM = [
  { id: "ruben", photo: "ruben", ini: "RS", hue: 20, name: "Ruben Saldanha", tag: "Executive President", badge: "President", bc: "", pop: "Student President • AgentBlazer Club", desc: "Guiding club vision, university collaborations, and strategic workshop series." },
  { id: "ajay", photo: "ajay", ini: "AD", hue: 210, name: "Ajay Preenal Dsouza", tag: "Executive Vice President", badge: "Vice President", bc: "v", pop: "Vice President • AgentBlazer Club", desc: "Coordinating student mentorship, event operations, and community growth." },
  { id: "stevin", photo: "stevin", ini: "SD", hue: 160, name: "Stevin Dsouza", tag: "Technical Direction", badge: "Tech Lead", bc: "", pop: "Tech Lead • AgentBlazer Club", desc: "Technical architectures, hands-on lab environments, and repository supervision." },
  { id: "frenny", photo: "frenny", ini: "FS", hue: 40, name: "Frenny Chrystal Saldanha", tag: "Operations & Logistics", tagGold: true, badge: "Resource Head", bc: "o", pop: "Resource Head • AgentBlazer Club", desc: "Managing cloud compute budgets, venue infrastructure, and participant toolkits." },
  { id: "joyline", photo: "joyline", ini: "JG", hue: 120, name: "Joyline Galbao", tag: "Administration", badge: "Secretary", bc: "", pop: "Secretary • AgentBlazer Club", desc: "Documentation, accreditation reporting, meeting minutes, and member onboarding." },
  { id: "chinthan", photo: "chinthan", ini: "CN", hue: 280, name: "Chinthan N V", tag: "Creative Outreach", badge: "Media Head", bc: "v", pop: "Media Head • AgentBlazer Club", desc: "Brand storytelling, photo documentation, visual design, and social publications." },
];

export const COMMITTEE = [
  { ini: "PR", name: "Prajwal Royston Cordiero", role: "AI & LLM Research Group" },
  { ini: "CA", name: "Chacko P Abraham", role: "Model Evaluation Benchmarks" },
  { ini: "AR", name: "Alma Roxane Pereira", role: "Project Operations & Labs" },
];

export const EVENTS = [
  { id: "gsoc", date: "February 14, 2026", tag: "Flagship Masterclass", tc: "c1", title: "Master the Future: A Hands-on GSoC & LLMs Workshop",
    desc: "Practical masterclass on open-source Git PR workflows, Retrieval-Augmented Generation (RAG), Gemini AI, LangChain, LlamaIndex, CrewAI, and live Gradio prototyping.",
    fl: "Tap to view gallery", fr: "80 Shortlisted Students",
    gal: { head: "GUEST SPEAKER: ANAS KHAN", title: "Master the Future: GSoC & LLMs", sub: "Anas Khan • Software Development Engineer, HackerRank", date: "Feb 14, 2026", hue: 200, n: 7, start: 0,
      real: { 0: gsoc0, 1: gsoc1, 2: gsoc2, 3: gsoc3, 4: gsoc4, 5: gsoc5, 6: gsoc6 } } },
  { id: "prompt", date: "March 25, 2026", tag: "Live Contest", tc: "c2", title: "PROMPT OPS-2K26 Challenge",
    tracks: ["Track 1: 1st Year Engineers", "Track 2: 2nd Year Engineers"],
    desc: "Fast-paced prompt engineering hackathon featuring automated test suites, iterative refinement, teamwork, and live algorithmic problem solving.",
    fl: "Tap to view gallery", fr: "10 Contest Photos",
    gal: { head: "CONTEST HIGHLIGHTS", title: "PROMPT OPS-2K26 Challenge", sub: "Track 1 & Track 2 • Live contest moments", date: "Mar 25, 2026", hue: 280, n: 5, start: 0,
      real: { 0: prompt0, 1: prompt1, 2: prompt2, 3: prompt3, 4: prompt4 } } },
  { id: "deep", date: "August 25, 2025", tag: "Symposium Keynote", tc: "c3", title: "Agentforce Technical Deep-Dive",
    desc: "Guiding undergraduate engineers from prompt prediction to autonomous agentic architectures, Salesforce Data Cloud integration, and real-time enterprise workflows.",
    fl: "Inaugural Technical Session", fr: "CSE Auditorium" },
  { id: "gen", date: "March 18, 2026", tag: "Student Lab", tc: "c2", title: "Demystifying Generative Models",
    sess: "Session Leads: Prajwal Royston Cordiero & Chacko P Abraham",
    desc: "Exploring Transformer mechanics, multi-agent consensus networks, and comparative latency benchmarks across open and hosted language models.",
    fl: "Student-led Session", fr: "CSE Labs" },
  { id: "cyber", date: "April 01, 2026", tag: "Security Workshop", tc: "c3", title: "Cyber Security & Career Pathways",
    desc: "Interactive demonstrations covering Shodan discovery, OSINT methods, CVE vulnerability analysis, SQL injection scenarios, and the Cyber Kill Chain.",
    fl: "Tap to view gallery", fr: "5 Session Photos",
    gal: { head: "SPEAKER: SUHAS NAYAK", title: "Cyber Security & Career Pathways", sub: "Tech Lead, SecOps, Ingersoll Rand • Live tool demos", date: "Apr 01, 2026", hue: 350, n: 5, start: 0,
      real: { 0: cyber0, 1: cyber1, 2: cyber2, 3: cyber3, 4: cyber4 } } },
  { id: "dev", date: "May 22, 2026", tag: "Developer Lab", tc: "c4", title: "Hands-on Agentforce & AI Agents",
    sess: "Platform: Salesforce Developer Sandbox",
    desc: "Applied development lab creating Flex Prompts, dynamic contextual Sales Email templates, and autonomous agent actions inside Salesforce orgs.",
    fl: "Trailhead Developer Orgs", fr: "CSE Labs" },
];

/* Used by App.jsx as a fallback so the page still looks complete on first
   run (before the admin has added real data) or if the backend is
   temporarily unreachable. Once the backend returns real events/team
   members, these are ignored. */
export const FALLBACK_EVENTS = EVENTS;
export const FALLBACK_TEAM = TEAM;

export const NAV = [
  { id: "home", label: "Home" },
  { id: "about", label: "About Us" },
  { id: "events", label: "Events & Workshops" },
  { id: "join", label: "Join & Connect" },
];
