import { Router } from 'express';
import { getCalendarSummary, getMe, updateMe } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/me', authMiddleware, getMe);
router.get('/calendar', authMiddleware, getCalendarSummary);
router.patch('/me', authMiddleware, updateMe);

export default router;
