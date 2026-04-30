import { Router, Response } from 'express';
import { register, login, refresh, logout, verify, resend } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';

const router = Router();

router.post('/register', register);
router.post('/verify-email', verify);
router.post('/resend-otp', resend);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);

router.get('/telegram-link', authenticate, async (req: any, res: Response) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`telegram_connect:${code}`, req.user.userId, 'EX', 600);
    res.json({
      code,
      botUsername: 'RideSyncKIITBot',
      link: `https://t.me/RideSyncKIITBot`,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/telegram-disconnect', authenticate, async (req: any, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { telegramChatId: null },
    });
    res.json({ message: 'Telegram disconnected' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;