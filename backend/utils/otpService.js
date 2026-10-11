const crypto = require("crypto");
const OtpVerification = require("../models/OtpVerification");
const { sendOtpEmail } = require("./sendEmail");

// Shared by any form that needs to confirm "is this a real, reachable
// college email" before accepting a submission (membership form, contact
// form, ...). One pending code per email at a time, 10-minute expiry,
// single use (the caller is responsible for deleting the record once
// it's been spent — see consumeVerification below).

async function requestOtp(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Replace any previous pending code for this email.
  await OtpVerification.deleteMany({ email: normalizedEmail });
  await OtpVerification.create({ email: normalizedEmail, otp, verified: false, expiresAt });

  await sendOtpEmail(normalizedEmail, otp);
}

async function verifyOtp(email, otp) {
  const normalizedEmail = email.trim().toLowerCase();
  const record = await OtpVerification.findOne({ email: normalizedEmail });

  if (!record || record.expiresAt < new Date()) {
    throw new Error("Code expired or not found. Please request a new one.");
  }
  if (record.otp !== otp.toString().trim()) {
    throw new Error("Incorrect verification code.");
  }

  record.verified = true;
  await record.save();
}

// Returns the verified OtpVerification doc for this email, or null.
async function getVerification(email) {
  const normalizedEmail = email.trim().toLowerCase();
  return OtpVerification.findOne({ email: normalizedEmail, verified: true });
}

async function consumeVerification(verificationDoc) {
  await OtpVerification.deleteOne({ _id: verificationDoc._id });
}

module.exports = { requestOtp, verifyOtp, getVerification, consumeVerification };