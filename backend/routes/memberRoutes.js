const express = require("express");
const MembershipApplication = require("../models/MembershipApplication");
const { protect } = require("../middleware/authMiddleware");
const { isCollegeEmail, ALLOWED_DOMAIN } = require("../utils/validateCollegeEmail");
const otpService = require("../utils/otpService");
const { sendEvaluationEmail, sendApplicationReceivedEmail } = require("../utils/sendEmail");
const { ROUNDS, RESULTS, nextStatus, migrateLegacyStatuses } = require("../utils/recruitment");

const router = express.Router();

// Step 1: student enters their college email -> we send a one-time code to it.
router.post("/request-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!isCollegeEmail(email)) {
      return res.status(400).json({ message: `Please use your official college email (${ALLOWED_DOMAIN})` });
    }

    await otpService.requestOtp(email);

    res.json({ message: "Verification code sent to your college email." });
  } catch (error) {
    res.status(500).json({ message: "Could not send verification code", error: error.message });
  }
});

// Step 2: student enters the code they received -> we mark that email as verified.
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    await otpService.verifyOtp(email, otp);

    res.json({ message: "Email verified successfully." });
  } catch (error) {
    res.status(400).json({ message: error.message || "Verification failed" });
  }
});

// Step 3: submit the actual application - only allowed once that email is verified.
router.post("/", async (req, res) => {
  try {
    const { name, email, usn } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }
    if (!usn || !usn.trim()) {
      return res.status(400).json({ message: "USN is required" });
    }
    if (!isCollegeEmail(email)) {
      return res.status(400).json({ message: `Please use your official college email (${ALLOWED_DOMAIN})` });
    }

    const verification = await otpService.getVerification(email);

    if (!verification) {
      return res.status(403).json({ message: "Please verify your college email before submitting." });
    }

    // Only accept the form fields - never let the applicant set their own
    // recruitment status / round results.
    const { phone, year, branch, interests, message } = req.body;
    const application = await MembershipApplication.create({
      name, email, usn, phone, year, branch, interests, message
    });

    // One-time use: consume the verification once the application is in.
    await otpService.consumeVerification(verification);

    // Confirmation email to the applicant. Awaited (so it also completes on
    // serverless hosts), but a mail failure must never fail the application.
    try {
      await sendApplicationReceivedEmail({ to: application.email, name: application.name });
    } catch (mailError) {
      console.error(`Could not send application confirmation to ${application.email}:`, mailError.message);
    }

    res.status(201).json({
      message: "Membership application submitted successfully",
      application
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not submit membership application",
      error: error.message
    });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    await migrateLegacyStatuses();
    const applications = await MembershipApplication.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Could not load applications", error: error.message });
  }
});

// Sends the round-result email for an application and records whether it worked.
async function sendAndRecord(application, round) {
  const outcome = application[round];
  try {
    await sendEvaluationEmail({
      to: application.email,
      name: application.name,
      round,
      result: outcome.result,
      note: outcome.note
    });
    application[round].emailSent = true;
    application[round].emailError = "";
  } catch (error) {
    console.error(`Could not send ${round} result email to ${application.email}:`, error.message);
    application[round].emailSent = false;
    application[round].emailError = error.message || "Email failed";
  }
  await application.save();
  return application[round].emailSent;
}

// Admin records the outcome of a round. The applicant is emailed straight away.
//   Aptitude round  -> selected: moves on to interview | rejected: out
//   Interview round -> selected: club member          | rejected: out
router.put("/:id/evaluate", protect, async (req, res) => {
  try {
    const { round, result } = req.body;
    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 1000) : "";

    if (!ROUNDS.includes(round)) {
      return res.status(400).json({ message: "Round must be 'aptitude' or 'interview'" });
    }
    if (!RESULTS.includes(result)) {
      return res.status(400).json({ message: "Result must be 'selected' or 'rejected'" });
    }

    // Atomic + conditional so a round can only be decided once (no duplicate
    // emails on double-click) and interview can only be decided after aptitude
    // was cleared.
    const filter = { _id: req.params.id, [`${round}.result`]: "pending" };
    if (round === "interview") filter["aptitude.result"] = "selected";

    const application = await MembershipApplication.findOneAndUpdate(
      filter,
      {
        $set: {
          status: nextStatus(round, result),
          [`${round}.result`]: result,
          [`${round}.note`]: note,
          [`${round}.decidedAt`]: new Date(),
          [`${round}.decidedBy`]: (req.user && req.user.email) || "",
          [`${round}.emailSent`]: false,
          [`${round}.emailError`]: ""
        }
      },
      { new: true }
    );

    if (!application) {
      const existing = await MembershipApplication.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: "Application not found" });
      if (round === "interview" && existing.aptitude.result !== "selected") {
        return res.status(409).json({ message: "The applicant must clear the aptitude round before the interview round." });
      }
      return res.status(409).json({ message: `The ${round} round has already been decided for this applicant.` });
    }

    const emailSent = await sendAndRecord(application, round);

    res.json({
      application,
      emailSent,
      message: emailSent
        ? `Marked ${result} and emailed ${application.email}`
        : `Marked ${result}, but the email to ${application.email} could not be sent. Use "Resend email".`
    });
  } catch (error) {
    res.status(400).json({ message: "Could not update application", error: error.message });
  }
});

// Retry the result email for a round that has already been decided
// (e.g. SMTP was down when the decision was saved).
router.post("/:id/resend-email", protect, async (req, res) => {
  try {
    const { round } = req.body;
    if (!ROUNDS.includes(round)) {
      return res.status(400).json({ message: "Round must be 'aptitude' or 'interview'" });
    }

    const application = await MembershipApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });
    if (application[round].result === "pending") {
      return res.status(409).json({ message: `The ${round} round has not been decided yet.` });
    }

    const emailSent = await sendAndRecord(application, round);

    res.json({
      application,
      emailSent,
      message: emailSent ? `Email sent to ${application.email}` : `Email could not be sent: ${application[round].emailError || "unknown error"}`
    });
  } catch (error) {
    res.status(400).json({ message: "Could not resend email", error: error.message });
  }
});

// Bulk delete applications (used by the "Select" / "Delete" toggle in the admin panel).
router.post("/bulk-delete", protect, async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (ids.length === 0) {
      return res.status(400).json({ message: "No applications selected" });
    }

    const result = await MembershipApplication.deleteMany({ _id: { $in: ids } });

    res.json({
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} application${result.deletedCount === 1 ? "" : "s"} deleted`
    });
  } catch (error) {
    res.status(400).json({ message: "Could not delete applications", error: error.message });
  }
});

module.exports = router;