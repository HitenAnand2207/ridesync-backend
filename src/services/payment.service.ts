import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { razorpay } from '../config/razorpay';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { GroupStatus, PaymentStatus } from '../../generated/prisma';
import { notificationQueue } from '../config/queue';

const PLATFORM_FEE = 30;

export const createPlatformFeeOrder = async (groupId: string, userId: string) => {
  const group = await prisma.rideGroup.findUnique({
    where: { id: groupId },
    include: { organizer: true },
  });

  if (!group) throw new Error('Group not found');
  if (group.organizerId !== userId) throw new Error('Only the organizer pays the platform fee');
  if (group.platformFeePaid) throw new Error('Platform fee already paid for this group');

  const order = await razorpay.orders.create({
    amount: PLATFORM_FEE * 100,
    currency: 'INR',
    receipt: `platform_fee_${Date.now()}`,
    notes: { groupId, userId, type: 'platform_fee' },
  });

  await prisma.payment.create({
    data: {
      groupId,
      userId,
      amount: PLATFORM_FEE,
      currency: 'INR',
      razorpayOrderId: order.id,
      status: PaymentStatus.PENDING,
    },
  });

  return {
    orderId: order.id,
    amount: PLATFORM_FEE * 100,
    currency: 'INR',
    groupId,
    keyId: env.razorpay.keyId,
    group: {
      origin: group.origin,
      destination: group.destination,
      departureTime: group.departureTime,
    },
  };
};

export const verifyPlatformFeePayment = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  groupId: string,
  userId: string
) => {
  const expectedSignature = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    await prisma.payment.update({
      where: { razorpayOrderId },
      data: { status: PaymentStatus.FAILED },
    });
    throw new Error('Payment verification failed');
  }

  const group = await prisma.rideGroup.findUnique({
    where: { id: groupId },
    include: { organizer: true },
  });
  if (!group) throw new Error('Group not found');

  await prisma.$transaction([
    prisma.payment.update({
      where: { razorpayOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: PaymentStatus.CAPTURED,
      },
    }),
    prisma.rideGroup.update({
      where: { id: groupId },
      data: { platformFeePaid: true, status: GroupStatus.OPEN },
    }),
  ]);

  await notificationQueue.add('group-created', {
    type: 'BOOKING_CONFIRMED',
    userId: group.organizer.id,
    email: group.organizer.email,
    name: group.organizer.name,
    rideOrigin: group.origin,
    rideDestination: group.destination,
    departureTime: group.departureTime.toISOString(),
    bookingId: groupId,
  });

  return { success: true, groupId };
};