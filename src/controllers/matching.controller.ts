import { Response } from 'express';
import { AuthRequest } from '../types';
import { getMatchedRides } from '../services/matching.service';

export const matchRides = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      origin,
      destination,
      departureTime,
      seats,
      originLat,
      originLng,
      destLat,
      destLng,
    } = req.query;

    if (!origin || !destination || !departureTime) {
      res.status(400).json({ message: 'origin, destination and departureTime are required' });
      return;
    }

    const matches = await getMatchedRides({
      origin: origin as string,
      destination: destination as string,
      departureTime: departureTime as string,
      seats: seats ? parseInt(seats as string) : 1,
      originLat: originLat ? parseFloat(originLat as string) : undefined,
      originLng: originLng ? parseFloat(originLng as string) : undefined,
      destLat: destLat ? parseFloat(destLat as string) : undefined,
      destLng: destLng ? parseFloat(destLng as string) : undefined,
    });

    res.json({ matches, count: matches.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};