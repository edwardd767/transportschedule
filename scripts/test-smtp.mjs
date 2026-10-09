// Sends a real test email using the SMTP settings entered in the app:
// Hotel Settings -> Standard Policy & Guidelines -> Terms & Conditions -> SMTP Settings -> Night Audit.
//
// Usage (PowerShell):
//   $env:SMTP_PASS="your-password"; npm.cmd run test:smtp
//
// Gmail example:
//   $env:SMTP_HOST="smtp.gmail.com"; $env:SMTP_PORT="465"; $env:SMTP_SSL="yes";
//   $env:SMTP_USER="you@gmail.com"; $env:SMTP_PASS="16-char-app-password"; npm.cmd run test:smtp
//   (Gmail requires 2-Step Verification, then create an App Password under
//    Google Account -> Security -> App passwords.)
//
// Env vars (all optional except SMTP_PASS):
//   SMTP_HOST     default mail.ifca.com.my
//   SMTP_PORT     default 587
//   SMTP_SSL      default "no" (STARTTLS; set "yes" for implicit TLS, typically on port 465)
//   SMTP_USER     default no-reply-eventx@ifca.com.my
//   SMTP_PASS     required - never commit it
//   SMTP_TO       default = SMTP_USER
//   SMTP_SUBJECT  optional override
//   SMTP_HTML     optional override
//
// The password is only read from the environment; nothing is written to the repo.

import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'mail.ifca.com.my';
const port = Number(process.env.SMTP_PORT || 587);
const secure = (process.env.SMTP_SSL || 'no').toLowerCase() === 'yes';
const user = process.env.SMTP_USER || 'no-reply-eventx@ifca.com.my';
const pass = process.env.SMTP_PASS;
const to = process.env.SMTP_TO || user;

if (!pass) {
  console.error('Missing SMTP_PASS.');
  console.error('PowerShell example:');
  console.error('  $env:SMTP_PASS="your-password"; npm.cmd run test:smtp');
  console.error('Gmail example:');
  console.error('  $env:SMTP_HOST="smtp.gmail.com"; $env:SMTP_USER="you@gmail.com"; $env:SMTP_PASS="app-password"; npm.cmd run test:smtp');
  process.exit(1);
}

const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
const subject = process.env.SMTP_SUBJECT || `[HotelX PMS] Daily Reports – HOTEL PARADISE – ${today}`;
const html = process.env.SMTP_HTML || [
  '<p>Dear Management Team,</p>',
  `<p>Please find attached the following system-generated reports for HOTEL PARADISE, dated ${today}, for your review and reference.</p>`,
  '<p>Report List:</p>',
  '<p>Booking Status (Arrival Next Day)</p>',
  '<p>Manager Report (Night Audit)</p>',
  '<p>Inhouse Guest Listing</p>',
  '<p>These reports have been automatically generated and distributed by HotelX PMS.</p>',
  '<p>Thank you.</p>',
  '<p>Best regards,<br>HotelX PMS<br>HOTEL PARADISE</p>',
  '<p>This is an automated email notification. Please do not reply to this email.</p>',
].join('');

console.log(`Connecting to ${host}:${port} (secure=${secure}) as ${user} ...`);
const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

try {
  await transporter.verify();
  console.log('SMTP connection + authentication OK.');
} catch (error) {
  console.error('SMTP verify failed:', error.message);
  process.exit(1);
}

const info = await transporter.sendMail({ from: user, to, subject, html });
console.log('Test email sent.');
console.log('  to:        ', to);
console.log('  subject:   ', subject);
console.log('  messageId: ', info.messageId);
console.log('  response:  ', info.response);
