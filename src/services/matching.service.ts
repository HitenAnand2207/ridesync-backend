import { prisma } from '../config/prisma';
import { RideStatus } from '../../generated/prisma';

interface MatchFilters {
  origin: string;
  destination: string;
  departureTime: string;
  seats?: number;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
}

interface ScoredRide {
  ride: any;
  score: number;
  reasons: string[];
}

const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const scoreRide = (ride: any, filters: MatchFilters): ScoredRide => {
  let score = 0;
  const reasons: string[] = [];

  // Text match on origin (30 points)
  const originMatch =
    ride.origin.toLowerCase().includes(filters.origin.toLowerCase()) ||
    filters.origin.toLowerCase().includes(ride.origin.toLowerCase());
  if (originMatch) {
    score += 30;
    reasons.push('Origin matches');
  }

  // Text match on destination (30 points)
  const destMatch =
    ride.destination.toLowerCase().includes(filters.destination.toLowerCase()) ||
    filters.destination.toLowerCase().includes(ride.destination.toLowerCase());
  if (destMatch) {
    score += 30;
    reasons.push('Destination matches');
  }

  // Geo proximity on origin (20 points scaled by distance)
  if (
    filters.originLat &&
    filters.originLng &&
    ride.originLat &&
    ride.originLng
  ) {
    const dist = haversineDistance(
      filters.originLat,
      filters.originLng,
      ride.originLat,
      ride.originLng
    );
    if (dist <= 1) {
      score += 20;
      reasons.push('Pickup within 1km');
    } else if (dist <= 3) {
      score += 12;
      reasons.push('Pickup within 3km');
    } else if (dist <= 5) {
      score += 6;
      reasons.push('Pickup within 5km');
    }
  }

  // Geo proximity on destination (20 points scaled by distance)
  if (
    filters.destLat &&
    filters.destLng &&
    ride.destLat &&
    ride.destLng
  ) {
    const dist = haversineDistance(
      filters.destLat,
      filters.destLng,
      ride.destLat,
      ride.destLng
    );
    if (dist <= 1) {
      score += 20;
      reasons.push('Dropoff within 1km');
    } else if (dist <= 3) {
      score += 12;
      reasons.push('Dropoff within 3km');
    } else if (dist <= 5) {
      score += 6;
      reasons.push('Dropoff within 5km');
    }
  }

  // Departure time proximity (20 points scaled by time diff)
  const requestedTime = new Date(filters.departureTime).getTime();
  const rideTime = new Date(ride.departureTime).getTime();
  const diffMinutes = Math.abs(requestedTime - rideTime) / (1000 * 60);

  if (diffMinutes <= 15) {
    score += 20;
    reasons.push('Departs within 15 minutes of requested time');
  } else if (diffMinutes <= 30) {
    score += 14;
    reasons.push('Departs within 30 minutes of requested time');
  } else if (diffMinutes <= 60) {
    score += 8;
    reasons.push('Departs within 1 hour of requested time');
  } else if (diffMinutes <= 120) {
    score += 3;
    reasons.push('Departs within 2 hours of requested time');
  }

  // Seat availability bonus (up to 10 points)
  const seatRatio = ride.availableSeats / ride.totalSeats;
  if (seatRatio >= 0.75) {
    score += 10;
    reasons.push('Plenty of seats available');
  } else if (seatRatio >= 0.5) {
    score += 6;
    reasons.push('Good seat availability');
  } else if (seatRatio >= 0.25) {
    score += 3;
    reasons.push('Limited seats available');
  }

  return { ride, score, reasons };
};

export const getMatchedRides = async (filters: MatchFilters) => {
  const seats = filters.seats || 1;

  const rides = await prisma.ride.findMany({
    where: {
      status: RideStatus.ACTIVE,
      availableSeats: { gte: seats },
    },
    include: {
      driver: {
        select: { id: true, name: true, email: true, phone: true },
      },
      _count: { select: { bookings: true } },
    },
  });

  const scored = rides
    .map((ride) => scoreRide(ride, filters))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored;
};