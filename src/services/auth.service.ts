import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendOtpEmail } from '../utils/mailer';

const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  phone?: string
) => {
  if (!email.endsWith('@kiit.ac.in')) {
    throw new Error('Only KIIT email addresses (@kiit.ac.in) are allowed');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already registered');

  const hashed = await hashPassword(password);
  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      phone,
      isVerified: false,
      otpCode: otp,
      otpExpiresAt,
    },
    select: { id: true, name: true, email: true, phone: true, createdAt: true, isVerified: true },
  });

  await sendOtpEmail(email, name, otp);

  return user;
};

export const verifyOtp = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new Error('User not found');
  if (user.isVerified) throw new Error('Email already verified');
  if (!user.otpCode || !user.otpExpiresAt) throw new Error('No OTP found. Please register again');
  if (new Date() > user.otpExpiresAt) throw new Error('OTP has expired. Please request a new one');
  if (user.otpCode !== otp) throw new Error('Invalid OTP');

  await prisma.user.update({
    where: { email },
    data: {
      isVerified: true,
      otpCode: null,
      otpExpiresAt: null,
    },
  });

  return { message: 'Email verified successfully' };
};

export const resendOtp = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new Error('User not found');
  if (user.isVerified) throw new Error('Email already verified');

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { email },
    data: { otpCode: otp, otpExpiresAt },
  });

  await sendOtpEmail(email, user.name, otp);

  return { message: 'OTP resent successfully' };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new Error('Invalid credentials');

  if (!user.isVerified) throw new Error('Please verify your email before logging in');

  const payload = { userId: user.id, email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await redis.set(
    `refresh:${user.id}`,
    refreshToken,
    'EX',
    7 * 24 * 60 * 60
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
  };
};

export const refreshAccessToken = async (token: string) => {
  const payload = verifyRefreshToken(token);

  const stored = await redis.get(`refresh:${payload.userId}`);
  if (!stored || stored !== token) throw new Error('Invalid refresh token');

  const newAccessToken = generateAccessToken({
    userId: payload.userId,
    email: payload.email,
  });

  return { accessToken: newAccessToken };
};

export const logoutUser = async (userId: string) => {
  await redis.del(`refresh:${userId}`);
};