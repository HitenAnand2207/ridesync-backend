import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';
import { notificationWorker } from './workers/notification.worker';
import { cleanupWorker } from './workers/cleanup.worker';
import { startScheduler } from './workers/scheduler';

const start = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected');

    notificationWorker;
    cleanupWorker;
    console.log('✅ BullMQ workers started');

    await startScheduler();

    app.listen(env.port, () => {
      console.log(`🚀 Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    await redis.quit();
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();