import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../config/prisma';
import { RideStatus } from '../../generated/prisma';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const processCleanup = async (job: Job) => {
  console.log('[CLEANUP] Running ride cleanup job...');

  const now = new Date();

  const expiredRides = await prisma.ride.updateMany({
    where: {
      departureTime: { lt: now },
      status: { in: [RideStatus.ACTIVE, RideStatus.FULL] },
    },
    data: { status: RideStatus.COMPLETED },
  });

  console.log(`[CLEANUP] Marked ${expiredRides.count} rides as COMPLETED`);
};

export const cleanupWorker = new Worker(
  'ride-cleanup',
  processCleanup,
  { connection }
);

cleanupWorker.on('completed', (job) => {
  console.log(`[CLEANUP] Job ${job.id} completed`);
});

cleanupWorker.on('failed', (job, err) => {
  console.error(`[CLEANUP] Job ${job?.id} failed:`, err.message);
});