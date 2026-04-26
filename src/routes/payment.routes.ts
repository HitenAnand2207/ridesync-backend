import { Router } from 'express';
import { createOrder, verify } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/rides/:id/pay', authenticate, createOrder);
router.post('/payments/verify', authenticate, verify);

export default router;