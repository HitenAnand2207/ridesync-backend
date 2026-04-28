import { Response } from 'express';
import { AuthRequest } from '../types';
import { getMatchedGroups } from '../services/matching.service';

export const matchGroups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const origin = req.query.origin as string | undefined;
    const destination = req.query.destination as string | undefined;
    const departureTime = req.query.departureTime as string | undefined;
    const slots = req.query.slots as string | undefined;

    if (!origin || !destination || !departureTime) {
      res.status(400).json({ message: 'origin, destination and departureTime are required' });
      return;
    }

    const matches = await getMatchedGroups({
      origin,
      destination,
      departureTime,
      slots: slots ? parseInt(slots) : 1,
    });

    res.json({ matches, count: matches.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};