import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../config/prisma';
import { GroupStatus } from '../../generated/prisma';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const processCleanup = async (job: Job) => {
  console.log('[CLEANUP] Running group cleanup job...');

  const now = new Date();

  const expiredGroups = await prisma.rideGroup.updateMany({
    where: {
      departureTime: { lt: now },
      status: { in: [GroupStatus.OPEN, GroupStatus.FULL] },
    },
    data: { status: GroupStatus.DEPARTED },
  });

  console.log(`[CLEANUP] Marked ${expiredGroups.count} groups as DEPARTED`);
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