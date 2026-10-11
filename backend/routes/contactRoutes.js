const express = require("express");
const ContactMessage = require("../models/ContactMessage");
const { protect } = require("../middleware/authMiddleware");
const { isCollegeEmail, ALLOWED_DOMAIN } = require("../utils/validateCollegeEmail");
const otpService = require("../utils/otpService");
const { sendContactNotification } = require("../utils/sendEmail");

const router = express.Router();

// Step 1: student enters their college email -> we send a one-time code to it.
// Same flow as the membership form, so a fake/typo'd email can't be used
// to spam the department inbox.
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

// Step 3: submit the actual message - only allowed once that email is verified.
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required" });
    }
    if (!isCollegeEmail(email)) {
      return res.status(400).json({ message: `Please use your official college email (${ALLOWED_DOMAIN})` });
    }

    const verification = await otpService.getVerification(email);

    if (!verification) {
      return res.status(403).json({ message: "Please verify your college email before submitting." });
    }

    const contact = await ContactMessage.create(req.body);

    // One-time use: consume the verification once the message is in.
    await otpService.consumeVerification(verification);

    // Best-effort: the message is already saved, so a mail hiccup shouldn't
    // fail the request or lose the submission — it'll still show up in the
    // admin Messages page either way.
    try {
      await sendContactNotification({ name, email, subject, message });
    } catch (mailError) {
      console.error("Contact notification email failed:", mailError.message);
    }

    res.status(201).json({
      message: "Message sent successfully",
      contact
    });
  } catch (error) {
    res.status(400).json({ message: "Could not send message", error: error.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Could not load messages", error: error.message });
  }
});

router.put("/:id/status", protect, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["new", "read", "replied"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!message) return res.status(404).json({ message: "Message not found" });

    res.json(message);
  } catch (error) {
    res.status(400).json({ message: "Could not update message", error: error.message });
  }
});

module.exports = router;