import { Router } from 'express';
import { matchGroups } from '../controllers/matching.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/match', authenticate, matchGroups);

export default router;