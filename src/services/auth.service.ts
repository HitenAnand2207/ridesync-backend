import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  phone?: string
) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already registered');

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, phone },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });

  return user;
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new Error('Invalid credentials');

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