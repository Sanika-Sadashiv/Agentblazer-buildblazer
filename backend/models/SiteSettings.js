const mongoose = require("mongoose");

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "main" },
    clubName: { type: String, default: "AgentBlazer Club" },
    academicYear: { type: String, default: "2025–2026" },
    defaultTheme: {
      type: String,
      enum: ["violet", "inferno", "frost"],
      default: "violet"
    },
    contactEmail: { type: String, default: "agentblazer@sjec.ac.in" },
    address: {
      type: String,
      default: "Department of Computer Science & Engineering, St Joseph Engineering College, Mangaluru, Karnataka – 575028, India"
    },
    stats: {
      workshops: { type: String, default: "8+" },
      studentsReached: { type: String, default: "500+" },
      partner: { type: String, default: "Salesforce" }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);
