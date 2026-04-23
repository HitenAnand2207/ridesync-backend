import { rideCleanupQueue } from '../config/queue';

export const startScheduler = async () => {
  await rideCleanupQueue.add(
    'cleanup',
    {},
    {
      repeat: {
        every: 60 * 60 * 1000,
      },
    }
  );

  console.log('⏰ Ride cleanup scheduler started (every 1 hour)');
};