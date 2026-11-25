const nodemailer = require('nodemailer');

// Email is optional. Without SMTP settings the server prints reset links to its console instead,
// which is enough for local development and demos.
const isConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

/** Resolves { sent: true } when delivered, { sent: false } when no email server is configured. */
async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) return { sent: false };
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || `SpendWise <${process.env.SMTP_USER}>`,
    to, subject, text, html
  });
  return { sent: true };
}

module.exports = { isConfigured, sendMail };
