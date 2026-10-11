const mongoose = require("mongoose");

// Result of one recruitment round (aptitude / interview).
const roundSchema = new mongoose.Schema(
  {
    result: { type: String, enum: ["pending", "selected", "rejected"], default: "pending" },
    note: { type: String, default: "" },        // optional admin note that is included in the email
    decidedAt: { type: Date, default: null },
    decidedBy: { type: String, default: "" },   // admin email
    emailSent: { type: Boolean, default: false },
    emailError: { type: String, default: "" }
  },
  { _id: false }
);

const membershipApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    usn: { type: String, required: true, trim: true, uppercase: true },
    phone: { type: String, default: "" },
    year: { type: String, default: "" },
    branch: { type: String, default: "" },
    interests: [{ type: String }],
    message: { type: String, default: "" },

    // Recruitment pipeline: Aptitude round -> Interview round -> Selected.
    // `status` is the overall position of the applicant in that pipeline.
    status: {
      type: String,
      enum: ["aptitude_pending", "interview_pending", "selected", "rejected"],
      default: "aptitude_pending"
    },
    aptitude: { type: roundSchema, default: () => ({}) },
    interview: { type: roundSchema, default: () => ({}) }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MembershipApplication", membershipApplicationSchema);
