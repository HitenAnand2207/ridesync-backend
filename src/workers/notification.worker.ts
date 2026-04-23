import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../config/prisma';
import { sendEmail } from '../utils/mailer';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export interface NotificationJobData {
  type: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'RIDE_CANCELLED';
  userId: string;
  email: string;
  name: string;
  rideOrigin: string;
  rideDestination: string;
  departureTime: string;
  bookingId?: string;
}

const processNotification = async (job: Job<NotificationJobData>) => {
  const { type, userId, email, name, rideOrigin, rideDestination, departureTime } = job.data;

  console.log(`[WORKER] Processing notification job: ${type} for ${email}`);

  let title = '';
  let message = '';
  let subject = '';
  let html = '';

  switch (type) {
    case 'BOOKING_CONFIRMED':
      title = 'Booking Confirmed!';
      message = `Your booking for ${rideOrigin} → ${rideDestination} on ${new Date(departureTime).toLocaleString()} has been confirmed.`;
      subject = 'RideSync — Booking Confirmed';
      html = `
        <h2>Hey ${name}, your ride is booked!</h2>
        <p><strong>From:</strong> ${rideOrigin}</p>
        <p><strong>To:</strong> ${rideDestination}</p>
        <p><strong>Departure:</strong> ${new Date(departureTime).toLocaleString()}</p>
        <p>Have a safe journey!</p>
        <br/>
        <p>— RideSync Team</p>
      `;
      break;

    case 'BOOKING_CANCELLED':
      title = 'Booking Cancelled';
      message = `Your booking for ${rideOrigin} → ${rideDestination} has been cancelled.`;
      subject = 'RideSync — Booking Cancelled';
      html = `
        <h2>Hey ${name}, your booking has been cancelled.</h2>
        <p><strong>From:</strong> ${rideOrigin}</p>
        <p><strong>To:</strong> ${rideDestination}</p>
        <p>You can search for another ride on RideSync.</p>
        <br/>
        <p>— RideSync Team</p>
      `;
      break;

    case 'RIDE_CANCELLED':
      title = 'Ride Cancelled by Driver';
      message = `The ride from ${rideOrigin} → ${rideDestination} on ${new Date(departureTime).toLocaleString()} has been cancelled by the driver.`;
      subject = 'RideSync — Ride Cancelled by Driver';
      html = `
        <h2>Hey ${name}, your ride has been cancelled.</h2>
        <p>The driver has cancelled the ride from <strong>${rideOrigin}</strong> to <strong>${rideDestination}</strong>.</p>
        <p>Please search for an alternative ride.</p>
        <br/>
        <p>— RideSync Team</p>
      `;
      break;
  }

  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type: 'INFO',
    },
  });

  await sendEmail(email, subject, html);

  console.log(`[WORKER] Notification saved and email sent for job: ${type}`);
};

export const notificationWorker = new Worker(
  'notifications',
  processNotification,
  {
    connection,
    concurrency: 5,
  }
);

notificationWorker.on('completed', (job) => {
  console.log(`[WORKER] Job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job?.id} failed:`, err.message);
});