import { Router } from 'express';
import { create, search, getOne, cancel, myRides } from '../controllers/ride.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticate, create);
router.get('/', authenticate, search);
router.get('/my', authenticate, myRides);
router.get('/:id', authenticate, getOne);
router.patch('/:id/cancel', authenticate, cancel);

export default router;