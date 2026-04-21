import { Response } from 'express';
import { AuthRequest } from '../types';
import {
  createRide,
  searchRides,
  getRideById,
  cancelRide,
  getMyRides,
} from '../services/ride.service';

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      origin,
      destination,
      originLat,
      originLng,
      destLat,
      destLng,
      departureTime,
      totalSeats,
      pricePerSeat,
      description,
    } = req.body;

    if (!origin || !destination || !departureTime || !totalSeats || !pricePerSeat) {
      res.status(400).json({ message: 'origin, destination, departureTime, totalSeats, pricePerSeat are required' });
      return;
    }

    const ride = await createRide(userId, {
      origin,
      destination,
      originLat,
      originLng,
      destLat,
      destLng,
      departureTime,
      totalSeats,
      pricePerSeat,
      description,
    });

    res.status(201).json({ message: 'Ride created successfully', ride });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const search = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const origin = req.query.origin as string | undefined;
    const destination = req.query.destination as string | undefined;
    const date = req.query.date as string | undefined;
    const seats = req.query.seats as string | undefined;

    const rides = await searchRides({
      origin,
      destination,
      date,
      seats: seats ? parseInt(seats) : undefined,
    });

    res.json({ rides, count: rides.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getOne = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ride = await getRideById(req.params['id'] as string);
    res.json({ ride });
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};

export const cancel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const ride = await cancelRide(req.params['id'] as string, userId);
    res.json({ message: 'Ride cancelled successfully', ride });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const myRides = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rides = await getMyRides(userId);
    res.json({ rides, count: rides.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};