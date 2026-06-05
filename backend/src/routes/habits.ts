import { Router } from 'express';
import {
  getHabits,
  createHabit,
  logHabit,
  getHabitLogs,
  deleteHabit,
  updateHabit,
} from '../controllers/habitController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, getHabits);
router.post('/', authMiddleware, createHabit);
router.post('/:id/log', authMiddleware, logHabit);
router.get('/:id/logs', authMiddleware, getHabitLogs);
router.delete('/:id', authMiddleware, deleteHabit);
router.patch('/:id', authMiddleware, updateHabit);

export default router;