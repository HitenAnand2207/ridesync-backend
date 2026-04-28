import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../config/prisma';
import { GroupStatus, MemberStatus } from '../../generated/prisma';

const generateOlaDeepLink = (destination: string): string => {
  const encoded = encodeURIComponent(destination);
  return `https://book.olacabs.com/?drop=${encoded}`;
};

const generateUberDeepLink = (destination: string): string => {
  const encoded = encodeURIComponent(destination);
  return `https://m.uber.com/ul/?action=setPickup&dropoff[nickname]=${encoded}`;
};

export const calculateShare = (estimatedFare: number, totalSlots: number): number => {
  return Math.ceil(estimatedFare / totalSlots);
};

export const createGroup = async (
  organizerId: string,
  data: {
    origin: string;
    destination: string;
    departureTime: string;
    totalSlots: number;
    estimatedFare: number;
    description?: string;
  }
) => {
  const group = await prisma.rideGroup.create({
    data: {
      organizerId,
      origin: data.origin,
      destination: data.destination,
      departureTime: new Date(data.departureTime),
      totalSlots: data.totalSlots,
      availableSlots: data.totalSlots - 1,
      estimatedFare: data.estimatedFare,
      description: data.description,
      olaDeepLink: generateOlaDeepLink(data.destination),
      uberDeepLink: generateUberDeepLink(data.destination),
      members: {
        create: {
          userId: organizerId,
          status: MemberStatus.CONFIRMED,
          share: calculateShare(data.estimatedFare, data.totalSlots),
        },
      },
    },
    include: {
      organizer: { select: { id: true, name: true, email: true, phone: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
  });

  return group;
};

export const searchGroups = async (filters: {
  origin?: string;
  destination?: string;
  date?: string;
  slots?: number;
}) => {
  const where: any = {
    status: GroupStatus.OPEN,
    availableSlots: { gte: 1 },
    platformFeePaid: true,
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

  const groups = await prisma.rideGroup.findMany({
    where,
    include: {
      organizer: { select: { id: true, name: true, email: true, phone: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { members: true } },
    },
    orderBy: { departureTime: 'asc' },
  });

  return groups;
};

export const getGroupById = async (id: string) => {
  const group = await prisma.rideGroup.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, name: true, email: true, phone: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
  });

  if (!group) throw new Error('Group not found');
  return group;
};

export const joinGroup = async (groupId: string, userId: string) => {
  const group = await prisma.rideGroup.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) throw new Error('Group not found');
  if (group.status !== GroupStatus.OPEN) throw new Error('This group is no longer open');
  if (!group.platformFeePaid) throw new Error('Group is not yet active');
  if (group.availableSlots <= 0) throw new Error('No slots available in this group');
  if (group.organizerId === userId) throw new Error('You are already the organizer of this group');

  const alreadyMember = group.members.find(m => m.userId === userId);
  if (alreadyMember) throw new Error('You have already joined this group');

  const share = calculateShare(group.estimatedFare, group.totalSlots);

  const [member] = await prisma.$transaction([
    prisma.groupMember.create({
      data: {
        groupId,
        userId,
        status: MemberStatus.CONFIRMED,
        share,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        group: {
          include: {
            organizer: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    }),
    prisma.rideGroup.update({
      where: { id: groupId },
      data: {
        availableSlots: { decrement: 1 },
        status: group.availableSlots - 1 === 0 ? GroupStatus.FULL : GroupStatus.OPEN,
      },
    }),
  ]);

  return member;
};

export const leaveGroup = async (groupId: string, userId: string) => {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: true },
  });

  if (!member) throw new Error('You are not a member of this group');
  if (member.group.organizerId === userId) throw new Error('Organizer cannot leave. Cancel the group instead.');
  if (member.status === MemberStatus.LEFT) throw new Error('You have already left this group');

  await prisma.$transaction([
    prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { status: MemberStatus.LEFT },
    }),
    prisma.rideGroup.update({
      where: { id: groupId },
      data: {
        availableSlots: { increment: 1 },
        status: GroupStatus.OPEN,
      },
    }),
  ]);

  return { message: 'You have left the group' };
};

export const cancelGroup = async (groupId: string, userId: string) => {
  const group = await prisma.rideGroup.findUnique({ where: { id: groupId } });

  if (!group) throw new Error('Group not found');
  if (group.organizerId !== userId) throw new Error('Only the organizer can cancel this group');
  if (group.status === GroupStatus.CANCELLED) throw new Error('Group already cancelled');

  const updated = await prisma.rideGroup.update({
    where: { id: groupId },
    data: { status: GroupStatus.CANCELLED },
  });

  return updated;
};

export const getMyGroups = async (userId: string) => {
  const groups = await prisma.rideGroup.findMany({
    where: { organizerId: userId },
    include: {
      _count: { select: { members: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return groups;
};

export const getMyMemberships = async (userId: string) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId, status: MemberStatus.CONFIRMED },
    include: {
      group: {
        include: {
          organizer: { select: { id: true, name: true, email: true, phone: true } },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return memberships;
};