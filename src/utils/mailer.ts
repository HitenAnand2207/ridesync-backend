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

export const sendOtpEmail = async (
  to: string,
  name: string,
  otp: string
): Promise<void> => {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #0f172a; margin-bottom: 8px;">Verify your KIIT email</h2>
      <p style="color: #475569; margin-bottom: 24px;">Hey ${name}, use the OTP below to verify your RideSync account.</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${otp}</div>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 8px;">Expires in 10 minutes</div>
      </div>
      <p style="color: #94a3b8; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 16px;">— RideSync Team</p>
    </div>
  `;

  await sendEmail(to, 'RideSync — Verify your email', html);
};