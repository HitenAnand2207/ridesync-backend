import { Router } from 'express';
import { book, myBookings, cancel, getOne } from '../controllers/booking.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/rides/:id/book', authenticate, book);
router.get('/bookings/my', authenticate, myBookings);
router.get('/bookings/:id', authenticate, getOne);
router.patch('/bookings/:id/cancel', authenticate, cancel);

export default router;