import { Response } from 'express';
import { AuthRequest } from '../types';
import { createPlatformFeeOrder, verifyPlatformFeePayment } from '../services/payment.service';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params['id'] as string;
    const order = await createPlatformFeeOrder(groupId, userId);
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const verify = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, groupId } = req.body;

    const result = await verifyPlatformFeePayment(
      razorpayOrderId, razorpayPaymentId,
      razorpaySignature, groupId, userId
    );

    res.json({ message: 'Payment verified. Your group is now live!', ...result });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};