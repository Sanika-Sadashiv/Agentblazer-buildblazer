const nodemailer = require("nodemailer");

// Gmail app passwords are shown as "abcd efgh ijkl mnop" - strip the spaces,
// and trim stray quotes/whitespace that often sneak into Vercel env values.
const clean = (v) => (v || "").trim().replace(/^["']|["']$/g, "");

const transporter = nodemailer.createTransport({
  host: clean(process.env.SMTP_HOST) || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for 587/others
  auth: {
    user: clean(process.env.SMTP_USER),
    pass: clean(process.env.SMTP_PASS).replace(/\s+/g, "")
  },
  // Local development only: set SMTP_ALLOW_SELF_SIGNED=true in backend/.env if an
  // antivirus / college proxy intercepts the connection. Never set it on Vercel.
  tls: { rejectUnauthorized: process.env.SMTP_ALLOW_SELF_SIGNED !== "true" },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
});

// Used by GET /api/health/smtp to check email settings without sending mail.
async function verifySmtp() {
  await transporter.verify();
}

async function sendOtpEmail(to, otp) {
  await transporter.sendMail({
    from: `"AgentBlazer Club" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your AgentBlazer Club Verification Code",
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:auto">
        <h2>AgentBlazer Club</h2>
        <p>Use the code below to verify your college email and complete your membership application:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#5b6ee8">${otp}</p>
        <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `
  });
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Notifies the CSE department whenever someone submits the public contact form.
async function sendContactNotification({ name, email, subject, message }) {
  const to = process.env.CONTACT_RECIPIENT || "24g15.nidhi@sjec.ac.in";

  await transporter.sendMail({
    from: `"AgentBlazer Club Website" <${process.env.SMTP_USER}>`,
    to,
    replyTo: email,
    subject: `[Contact Form] ${subject && subject.trim() ? subject : "New message from " + name}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ""}
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap;border-left:3px solid #5b6ee8;padding-left:12px">${escapeHtml(message)}</p>
        <p style="color:#888;font-size:12px;margin-top:24px">Sent via the AgentBlazer Club website contact form. Reply-to is set to the sender's email.</p>
      </div>
    `
  });
}

// Confirms to the student that their membership application was received.
async function sendApplicationReceivedEmail({ to, name }) {
  const safeName = escapeHtml(name);

  await transporter.sendMail({
    from: `"AgentBlazer Club" <${process.env.SMTP_USER}>`,
    to,
    subject: "AgentBlazer Club – We received your application",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;line-height:1.6;color:#222">
        <h2 style="color:#5b6ee8">Application received</h2>
        <p>Hi ${safeName},</p>
        <p>Thank you for applying to join the <strong>AgentBlazer Club</strong>! We have received your membership application.</p>
        <p>Our team will review it and get in touch with you on this email address about the next steps of the recruitment process.</p>
        <p style="color:#888;font-size:12px;margin-top:28px">– AgentBlazer Club, SJEC</p>
      </div>
    `
  });
}

// ---------------------------------------------------------------------------
// Recruitment result emails (sent to the student's college email)
// ---------------------------------------------------------------------------
const EVALUATION_EMAILS = {
  aptitude: {
    selected: {
      subject: "AgentBlazer Club – You cleared the Aptitude Round 🎉",
      heading: "You're through to the Interview Round!",
      body: (name) =>
        `Hi ${name},<br/><br/>Congratulations! You have <strong>cleared the Aptitude Round</strong> of the AgentBlazer Club recruitment process and have been shortlisted for the <strong>Interview Round</strong>.<br/><br/>Please watch your college email for further updates.`
    },
    rejected: {
      subject: "AgentBlazer Club – Aptitude Round result",
      heading: "Update on your application",
      body: (name) =>
        `Hi ${name},<br/><br/>Thank you for taking the time to attend the Aptitude Round of the AgentBlazer Club recruitment. After careful evaluation, we're sorry to let you know that you have <strong>not been shortlisted</strong> for the next round this time.<br/><br/>Please don't be discouraged – keep building, keep learning, and we'd love to see you at our events and future recruitments.`
    }
  },
  interview: {
    selected: {
      subject: "AgentBlazer Club – Welcome to the club! 🎉",
      heading: "You're selected!",
      body: (name) =>
        `Hi ${name},<br/><br/>Congratulations! After the Aptitude and Interview rounds, we're delighted to let you know that you have been <strong>selected as a member of the AgentBlazer Club</strong>.<br/><br/>Welcome aboard – we'll share the next steps with you shortly.`
    },
    rejected: {
      subject: "AgentBlazer Club – Interview Round result",
      heading: "Update on your application",
      body: (name) =>
        `Hi ${name},<br/><br/>Thank you for attending the Interview Round of the AgentBlazer Club recruitment. After careful evaluation, we're sorry to let you know that you have <strong>not been selected</strong> this time.<br/><br/>We appreciate the effort you put in and encourage you to keep learning and to apply again in the future.`
    }
  }
};

// Sends the outcome of a recruitment round to the applicant's college email.
// `note` is an optional message from the admin (e.g. interview date & venue).
async function sendEvaluationEmail({ to, name, round, result, note }) {
  const template = EVALUATION_EMAILS[round] && EVALUATION_EMAILS[round][result];
  if (!template) throw new Error(`No email template for ${round}/${result}`);

  const safeName = escapeHtml(name);
  const noteBlock = note && note.trim()
    ? `<p style="white-space:pre-wrap;border-left:3px solid #5b6ee8;padding-left:12px;margin:18px 0"><strong>Note from the team:</strong><br/>${escapeHtml(note.trim())}</p>`
    : "";

    const htmlBody = template.body(safeName);
  const textBody = htmlBody.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "") +
    (note && note.trim() ? `\n\nNote from the team:\n${note.trim()}` : "") +
    "\n\n– AgentBlazer Club, SJEC";

  const info = await transporter.sendMail({
    from: `"AgentBlazer Club" <${process.env.SMTP_USER}>`,
    to,
    subject: template.subject,
    text: textBody,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;line-height:1.6;color:#222">
        <h2 style="color:#5b6ee8">${template.heading}</h2>
        <p>${htmlBody}</p>
        ${noteBlock}
        <p style="color:#888;font-size:12px;margin-top:28px">– AgentBlazer Club, SJEC</p>
      </div>
    `
  });

  // Treat "server didn't accept the recipient" as a failure so the admin sees it.
  if (!info.accepted || info.accepted.length === 0) {
    throw new Error(`Mail server did not accept the recipient (${(info.rejected || []).join(", ") || "unknown reason"})`);
  }
  console.log(`[mail] ${round}/${result} email sent to ${to} | id=${info.messageId} | ${info.response}`);
}
module.exports = { verifySmtp, sendOtpEmail, sendContactNotification, sendEvaluationEmail, sendApplicationReceivedEmail };