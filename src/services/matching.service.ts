import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../config/prisma';
import { GroupStatus } from '../../generated/prisma';

interface MatchFilters {
  origin: string;
  destination: string;
  departureTime: string;
  slots?: number;
}

interface ScoredGroup {
  group: any;
  score: number;
  reasons: string[];
}

const scoreGroup = (group: any, filters: MatchFilters): ScoredGroup => {
  let score = 0;
  const reasons: string[] = [];

  const originMatch =
    group.origin.toLowerCase().includes(filters.origin.toLowerCase()) ||
    filters.origin.toLowerCase().includes(group.origin.toLowerCase());
  if (originMatch) { score += 35; reasons.push('Origin matches'); }

  const destMatch =
    group.destination.toLowerCase().includes(filters.destination.toLowerCase()) ||
    filters.destination.toLowerCase().includes(group.destination.toLowerCase());
  if (destMatch) { score += 35; reasons.push('Destination matches'); }

  const requestedTime = new Date(filters.departureTime).getTime();
  const groupTime = new Date(group.departureTime).getTime();
  const diffMinutes = Math.abs(requestedTime - groupTime) / (1000 * 60);

  if (diffMinutes <= 15) { score += 20; reasons.push('Departs within 15 minutes'); }
  else if (diffMinutes <= 30) { score += 14; reasons.push('Departs within 30 minutes'); }
  else if (diffMinutes <= 60) { score += 8; reasons.push('Departs within 1 hour'); }
  else if (diffMinutes <= 120) { score += 3; reasons.push('Departs within 2 hours'); }

  const slotRatio = group.availableSlots / group.totalSlots;
  if (slotRatio >= 0.75) { score += 10; reasons.push('Plenty of slots available'); }
  else if (slotRatio >= 0.5) { score += 6; reasons.push('Good availability'); }
  else if (slotRatio > 0) { score += 3; reasons.push('Limited slots'); }

  return { group, score, reasons };
};

export const getMatchedGroups = async (filters: MatchFilters) => {
  const groups = await prisma.rideGroup.findMany({
    where: {
      status: GroupStatus.OPEN,
      availableSlots: { gte: 1 },
      platformFeePaid: true,
    },
    include: {
      organizer: { select: { id: true, name: true, email: true, phone: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { members: true } },
    },
  });

  const scored = groups
    .map((group) => scoreGroup(group, filters))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored;
};