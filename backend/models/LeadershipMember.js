const mongoose = require("mongoose");

const leadershipMemberSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["guest", "faculty"], required: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },

    // guest-only fields ("Honored Guests & College Leadership")
    org: { type: String, default: "" },
    label: { type: String, default: "" },       // left tag, e.g. "Guest of Honor"
    highlight: { type: String, default: "" },   // right tag, e.g. "Keynote Speaker"
    highlightColor: { type: String, enum: ["c-gold", "c-cy", "c-pu"], default: "c-gold" },
    accentColor: { type: String, enum: ["c-cy", "p"], default: "c-cy" },

    // faculty-only fields ("Faculty Advisory Council")
    role: { type: String, default: "" },
    photo: { type: String, default: "" }, // base64 data URL
    bio: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeadershipMember", leadershipMemberSchema);