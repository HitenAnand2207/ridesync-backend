import { Response } from 'express';
import { AuthRequest } from '../types';
import {
  createGroup,
  searchGroups,
  getGroupById,
  joinGroup,
  leaveGroup,
  cancelGroup,
  getMyGroups,
  getMyMemberships,
} from '../services/group.service';

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { origin, destination, departureTime, totalSlots, estimatedFare, description } = req.body;

    if (!origin || !destination || !departureTime || !totalSlots || !estimatedFare) {
      res.status(400).json({ message: 'origin, destination, departureTime, totalSlots and estimatedFare are required' });
      return;
    }

    const group = await createGroup(userId, {
      origin, destination, departureTime,
      totalSlots: parseInt(totalSlots),
      estimatedFare: parseFloat(estimatedFare),
      description,
    });

    res.status(201).json({ message: 'Group created. Pay ₹30 platform fee to make it visible.', group });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const search = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const origin = req.query.origin as string | undefined;
    const destination = req.query.destination as string | undefined;
    const date = req.query.date as string | undefined;
    const slots = req.query.slots as string | undefined;

    const groups = await searchGroups({
      origin, destination, date,
      slots: slots ? parseInt(slots) : undefined,
    });

    res.json({ groups, count: groups.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getOne = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await getGroupById(req.params['id'] as string);
    res.json({ group });
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const join = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params['id'] as string;
    const member = await joinGroup(groupId, userId);
    res.status(201).json({ message: 'Successfully joined the group!', member });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const leave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params['id'] as string;
    const result = await leaveGroup(groupId, userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const cancel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const group = await cancelGroup(req.params['id'] as string, userId);
    res.json({ message: 'Group cancelled successfully', group });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const myGroups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const groups = await getMyGroups(userId);
    res.json({ groups, count: groups.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const myMemberships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const memberships = await getMyMemberships(userId);
    res.json({ memberships, count: memberships.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};