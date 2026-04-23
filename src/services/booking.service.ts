import { prisma } from '../config/prisma';
import { BookingStatus, RideStatus } from '../../generated/prisma';
import { notificationQueue } from '../config/queue';

export const bookRide = async (rideId: string, userId: string, seats: number = 1) => {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });

  if (!ride) throw new Error('Ride not found');
  if (ride.status !== RideStatus.ACTIVE) throw new Error('Ride is not available for booking');
  if (ride.driverId === userId) throw new Error('You cannot book your own ride');
  if (ride.availableSeats < seats) throw new Error(`Only ${ride.availableSeats} seat(s) available`);

  const existingBooking = await prisma.booking.findUnique({
    where: { rideId_userId: { rideId, userId } },
  });
  if (existingBooking) throw new Error('You have already booked this ride');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const [booking] = await prisma.$transaction([
    prisma.booking.create({
      data: { rideId, userId, seats, status: BookingStatus.CONFIRMED },
      include: {
        ride: {
          include: {
            driver: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.ride.update({
      where: { id: rideId },
      data: {
        availableSeats: { decrement: seats },
        status: ride.availableSeats - seats === 0 ? RideStatus.FULL : RideStatus.ACTIVE,
      },
    }),
  ]);

  await notificationQueue.add('booking-confirmed', {
    type: 'BOOKING_CONFIRMED',
    userId: user.id,
    email: user.email,
    name: user.name,
    rideOrigin: ride.origin,
    rideDestination: ride.destination,
    departureTime: ride.departureTime.toISOString(),
    bookingId: booking.id,
  });

  return booking;
};

export const getMyBookings = async (userId: string) => {
  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: {
      ride: {
        include: {
          driver: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return bookings;
};

export const cancelBooking = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { ride: true },
  });

  if (!booking) throw new Error('Booking not found');
  if (booking.userId !== userId) throw new Error('Not authorized to cancel this booking');
  if (booking.status === BookingStatus.CANCELLED) throw new Error('Booking already cancelled');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const [updated] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    }),
    prisma.ride.update({
      where: { id: booking.rideId },
      data: {
        availableSeats: { increment: booking.seats },
        status: RideStatus.ACTIVE,
      },
    }),
  ]);

  await notificationQueue.add('booking-cancelled', {
    type: 'BOOKING_CANCELLED',
    userId: user.id,
    email: user.email,
    name: user.name,
    rideOrigin: booking.ride.origin,
    rideDestination: booking.ride.destination,
    departureTime: booking.ride.departureTime.toISOString(),
    bookingId: booking.id,
  });

  return updated;
};

export const getBookingById = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      ride: {
        include: {
          driver: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!booking) throw new Error('Booking not found');
  if (booking.userId !== userId) throw new Error('Not authorized to view this booking');

  return booking;
};