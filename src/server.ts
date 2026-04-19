import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';

const start = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected');

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