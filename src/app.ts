import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import groupRoutes from './routes/group.routes';
import matchingRoutes from './routes/matching.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/test-auth', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api', matchingRoutes);
app.use('/api', paymentRoutes);

app.use(errorHandler);

export default app;