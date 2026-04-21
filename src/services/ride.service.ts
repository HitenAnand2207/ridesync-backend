import { prisma } from '../config/prisma';
import { RideStatus } from '../../generated/prisma';

export const createRide = async (
  driverId: string,
  data: {
    origin: string;
    destination: string;
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    departureTime: string;
    totalSeats: number;
    pricePerSeat: number;
    description?: string;
  }
) => {
  const ride = await prisma.ride.create({
    data: {
      driverId,
      origin: data.origin,
      destination: data.destination,
      originLat: data.originLat,
      originLng: data.originLng,
      destLat: data.destLat,
      destLng: data.destLng,
      departureTime: new Date(data.departureTime),
      totalSeats: data.totalSeats,
      availableSeats: data.totalSeats,
      pricePerSeat: data.pricePerSeat,
      description: data.description,
    },
    include: {
      driver: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  return ride;
};

export const searchRides = async (filters: {
  origin?: string;
  destination?: string;
  date?: string;
  seats?: number;
}) => {
  const where: any = {
    status: RideStatus.ACTIVE,
    availableSeats: { gte: filters.seats || 1 },
  };

  if (filters.origin) {
    where.origin = { contains: filters.origin, mode: 'insensitive' };
  }

  if (filters.destination) {
    where.destination = { contains: filters.destination, mode: 'insensitive' };
  }

  if (filters.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    where.departureTime = { gte: start, lte: end };
  }

  const rides = await prisma.ride.findMany({
    where,
    include: {
      driver: {
        select: { id: true, name: true, email: true, phone: true },
      },
      _count: { select: { bookings: true } },
    },
    orderBy: { departureTime: 'asc' },
  });

  return rides;
};

export const getRideById = async (id: string) => {
  const ride = await prisma.ride.findUnique({
    where: { id },
    include: {
      driver: {
        select: { id: true, name: true, email: true, phone: true },
      },
      bookings: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!ride) throw new Error('Ride not found');
  return ride;
};

export const cancelRide = async (id: string, userId: string) => {
  const ride = await prisma.ride.findUnique({ where: { id } });

  if (!ride) throw new Error('Ride not found');
  if (ride.driverId !== userId) throw new Error('Not authorized to cancel this ride');
  if (ride.status === RideStatus.CANCELLED) throw new Error('Ride already cancelled');

  const updated = await prisma.ride.update({
    where: { id },
    data: { status: RideStatus.CANCELLED },
  });

  return updated;
};

export const getMyRides = async (userId: string) => {
  const rides = await prisma.ride.findMany({
    where: { driverId: userId },
    include: {
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rides;
};