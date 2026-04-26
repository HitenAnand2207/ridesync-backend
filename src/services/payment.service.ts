import crypto from 'crypto';
import { razorpay } from '../config/razorpay';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { BookingStatus, PaymentStatus, RideStatus } from '../../generated/prisma';
import { notificationQueue } from '../config/queue';

export const createPaymentOrder = async (
  rideId: string,
  userId: string,
  seats: number = 1
) => {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new Error('Ride not found');
  if (ride.status !== RideStatus.ACTIVE) throw new Error('Ride is not available');
  if (ride.driverId === userId) throw new Error('You cannot book your own ride');
  if (ride.availableSeats < seats) throw new Error(`Only ${ride.availableSeats} seat(s) available`);

  const existing = await prisma.booking.findUnique({
    where: { rideId_userId: { rideId, userId } },
  });
  if (existing) throw new Error('You have already booked this ride');

  const amount = ride.pricePerSeat * seats;

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    notes: { rideId, userId, seats: seats.toString() },
  });

  const booking = await prisma.booking.create({
    data: {
      rideId,
      userId,
      seats,
      status: BookingStatus.PENDING,
      payment: {
        create: {
          userId,
          amount,
          currency: 'INR',
          razorpayOrderId: order.id,
          status: PaymentStatus.PENDING,
        },
      },
    },
  });

  return {
    orderId: order.id,
    amount: Math.round(amount * 100),
    currency: 'INR',
    bookingId: booking.id,
    keyId: env.razorpay.keyId,
    ride: {
      origin: ride.origin,
      destination: ride.destination,
      departureTime: ride.departureTime,
    },
  };
};

export const verifyPayment = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  bookingId: string,
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

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { ride: true, user: true },
  });
  if (!booking) throw new Error('Booking not found');

  await prisma.$transaction([
    prisma.payment.update({
      where: { razorpayOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: PaymentStatus.CAPTURED,
      },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    }),
    prisma.ride.update({
      where: { id: booking.rideId },
      data: {
        availableSeats: { decrement: booking.seats },
        status:
          booking.ride.availableSeats - booking.seats === 0
            ? RideStatus.FULL
            : RideStatus.ACTIVE,
      },
    }),
  ]);

  await notificationQueue.add('booking-confirmed', {
    type: 'BOOKING_CONFIRMED',
    userId: booking.user.id,
    email: booking.user.email,
    name: booking.user.name,
    rideOrigin: booking.ride.origin,
    rideDestination: booking.ride.destination,
    departureTime: booking.ride.departureTime.toISOString(),
    bookingId: booking.id,
  });

  return { success: true, bookingId };
};