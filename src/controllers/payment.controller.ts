import { Response } from 'express';
import { AuthRequest } from '../types';
import { createPaymentOrder, verifyPayment } from '../services/payment.service';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rideId = req.params['id'] as string;
    const { seats } = req.body;

    const order = await createPaymentOrder(rideId, userId, seats || 1);
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const verify = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      bookingId,
    } = req.body;

    const result = await verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      bookingId,
      userId
    );

    res.json({ message: 'Payment verified and booking confirmed', ...result });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};