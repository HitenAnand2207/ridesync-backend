import { Router } from 'express';
import { create, search, getOne, join, leave, cancel, myGroups, myMemberships } from '../controllers/group.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticate, create);
router.get('/', authenticate, search);
router.get('/my', authenticate, myGroups);
router.get('/memberships', authenticate, myMemberships);
router.get('/:id', authenticate, getOne);
router.post('/:id/join', authenticate, join);
router.patch('/:id/leave', authenticate, leave);
router.patch('/:id/cancel', authenticate, cancel);

export default router;