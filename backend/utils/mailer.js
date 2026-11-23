const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const isProduction = process.env.NODE_ENV === "production";
const DEV_MAIL_LOG = path.join(__dirname, "..", "dev-mail.log");

let transporter = null;

// SMTP is configured through .env (works with Gmail app passwords, Brevo, Resend, Mailtrap…).
const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
};

const isMailConfigured = () => Boolean(process.env.SMTP_HOST);

// Sends an email. Without SMTP in development, the message is written to the
// console and backend/dev-mail.log instead, so flows can be tested locally.
// In production without SMTP it fails loudly rather than silently dropping mail.
const sendMail = async ({ to, subject, text, html }) => {
  const transport = getTransporter();

  if (!transport) {
    if (isProduction) {
      throw new Error("Email is not configured (SMTP_HOST missing)");
    }
    const entry = `\n[${new Date().toISOString()}] To: ${to}\nSubject: ${subject}\n${text}\n`;
    console.log(`--- DEV MAIL (SMTP not configured) ---${entry}--------------------------------------`);
    try {
      fs.appendFileSync(DEV_MAIL_LOG, entry);
    } catch {
      // Logging to the file is a convenience only.
    }
    return { dev: true };
  }

  return transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
};

module.exports = { sendMail, isMailConfigured };
