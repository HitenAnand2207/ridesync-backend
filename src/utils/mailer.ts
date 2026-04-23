import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: false,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  if (!env.smtp.user || !env.smtp.pass) {
    console.log(`[MAILER] Email skipped (no SMTP config): ${subject} → ${to}`);
    return;
  }

  await transporter.sendMail({
    from: `"RideSync" <${env.smtp.user}>`,
    to,
    subject,
    html,
  });

  console.log(`[MAILER] Email sent: ${subject} → ${to}`);
};