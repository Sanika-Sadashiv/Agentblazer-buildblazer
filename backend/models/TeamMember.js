const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true },
    category: { type: String, default: "Student Core Team" },
    department: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    // "core" = Student Core Team grid on the About page, "committee" = Core Working Committee row
    section: { type: String, enum: ["core", "committee"], default: "core" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamMember", teamMemberSchema);