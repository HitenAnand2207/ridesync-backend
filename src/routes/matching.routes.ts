import { Router } from 'express';
import { matchRides } from '../controllers/matching.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/match', authenticate, matchRides);

export default router;