import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../config/prisma';
import { sendEmail } from '../utils/mailer';
import { sendTelegramMessage, buildTelegramMessage } from '../utils/telegram';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export interface NotificationJobData {
  type: 'GROUP_CREATED' | 'MEMBER_JOINED' | 'MEMBER_LEFT' | 'GROUP_CANCELLED';
  groupId: string;
  triggerUserId?: string;
}

const processNotification = async (job: Job<NotificationJobData>) => {
  const { type, groupId } = job.data;
  console.log(`[WORKER] Processing: ${type} for group ${groupId}`);

  const group = await prisma.rideGroup.findUnique({
    where: { id: groupId },
    include: {
      organizer: true,
      members: {
        where: { status: 'CONFIRMED' },
        include: { user: true },
      },
    },
  });

  if (!group) return;

  const filledSlots = group.members.length;
  const share = Math.ceil(group.estimatedFare / group.totalSlots);

  for (const member of group.members) {
    const isOrganizer = member.userId === group.organizerId;

    const message = buildTelegramMessage({
      origin: group.origin,
      destination: group.destination,
      departureTime: group.departureTime.toISOString(),
      share,
      totalSlots: group.totalSlots,
      filledSlots,
      organizerName: group.organizer.name,
      organizerPhone: group.organizer.phone,
      olaDeepLink: group.olaDeepLink || '',
      uberDeepLink: group.uberDeepLink || '',
      isOrganizer,
      eventType: type,
    });

    await prisma.notification.create({
      data: {
        userId: member.userId,
        title: type === 'GROUP_CREATED' ? 'Group is live!' :
               type === 'MEMBER_JOINED' ? 'New member joined' :
               type === 'MEMBER_LEFT' ? 'Member left' : 'Group cancelled',
        message: `${group.origin} → ${group.destination}`,
        type: 'INFO',
      },
    });

    if (member.user.telegramChatId) {
      await sendTelegramMessage(member.user.telegramChatId, message);
    }

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #4f46e5; margin-bottom: 4px;">RideSync</h2>
        <p style="color: #64748b; font-size: 13px; margin-bottom: 24px;">Share cabs. Split the fare.</p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px; color: #0f172a;">${group.origin} → ${group.destination}</h3>
          <p style="margin: 0 0 8px; color: #475569;"><strong>Departure:</strong> ${new Date(group.departureTime).toLocaleString()}</p>
          <p style="margin: 0 0 8px; color: #475569;"><strong>Your share:</strong> ₹${share}</p>
          <p style="margin: 0 0 8px; color: #475569;"><strong>Slots:</strong> ${filledSlots}/${group.totalSlots} filled</p>
          <p style="margin: 0; color: #475569;"><strong>Organizer:</strong> ${group.organizer.name}</p>
        </div>
        ${isOrganizer ? `
        <div style="margin-bottom: 24px;">
          <a href="${group.olaDeepLink}" style="display: inline-block; background: #f97316; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 8px;">Book on Ola</a>
          <a href="${group.uberDeepLink}" style="display: inline-block; background: #1c1917; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Book on Uber</a>
        </div>
        ` : ''}
        <p style="font-size: 13px; color: #94a3b8;">Pay your share to the organizer via UPI.</p>
      </div>
    `;

    await sendEmail(
      member.user.email,
      `RideSync — ${group.origin} → ${group.destination}`,
      emailHtml
    );
  }

  console.log(`[WORKER] Done — notified ${group.members.length} members`);
};

export const notificationWorker = new Worker(
  'notifications',
  processNotification,
  { connection, concurrency: 3 }
);

notificationWorker.on('completed', (job) => {
  console.log(`[WORKER] Job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job?.id} failed:`, err.message);
});