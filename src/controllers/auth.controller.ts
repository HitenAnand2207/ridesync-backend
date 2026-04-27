import { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyOtp,
  resendOtp,
} from '../services/auth.service';
import { AuthRequest } from '../types';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email and password are required' });
      return;
    }

    const user = await registerUser(name, email, password, phone);
    res.status(201).json({
      message: 'Account created. Please check your KIIT email for the OTP.',
      user,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const verify = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: 'Email and OTP are required' });
      return;
    }
    const result = await verifyOtp(email, otp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const resend = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }
    const result = await resendOtp(email);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const data = await loginUser(email, password);

    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Login successful',
      accessToken: data.accessToken,
      user: data.user,
    });
  } catch (err: any) {
    res.status(401).json({ message: err.message });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ message: 'No refresh token' });
      return;
    }

    const data = await refreshAccessToken(token);
    res.json(data);
  } catch (err: any) {
    res.status(401).json({ message: err.message });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user;
    if (user) await logoutUser(user.userId);

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};