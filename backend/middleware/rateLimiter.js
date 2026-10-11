const rateLimit = require("express-rate-limit");

// Public-facing forms (contact, membership signup): generous enough for a
// real visitor, tight enough to stop spam/scripted submissions.
const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many submissions from this IP. Please try again later." }
});

// Login: stricter, to slow down brute-force password guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." }
});

// OTP request/verify: tight limit to prevent email-spam abuse and OTP brute-forcing.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many verification attempts. Please try again later." }
});

module.exports = { publicFormLimiter, authLimiter, otpLimiter };
