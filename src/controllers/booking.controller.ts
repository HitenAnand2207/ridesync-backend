import { Response } from 'express';
import { AuthRequest } from '../types';
import {
  bookRide,
  getMyBookings,
  cancelBooking,
  getBookingById,
} from '../services/booking.service';

export const book = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rideId = req.params['id'] as string;
    const { seats } = req.body;

    const booking = await bookRide(rideId, userId, seats || 1);
    res.status(201).json({ message: 'Ride booked successfully', booking });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const myBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const bookings = await getMyBookings(userId);
    res.json({ bookings, count: bookings.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const cancel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const bookingId = req.params['id'] as string;
    const booking = await cancelBooking(bookingId, userId);
    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const getOne = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const bookingId = req.params['id'] as string;
    const booking = await getBookingById(bookingId, userId);
    res.json({ booking });
  } catch (err: any) {
    res.status(404).json({ message: err.message });
  }
};