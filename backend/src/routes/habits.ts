import { Router } from 'express';
import {
  getHabits,
  createHabit,
  logHabit,
  getHabitLogs,
  markHabitLogAsShared,
  deleteHabit,
  updateHabit,
  autoFailUnloggedHabits,
} from '../controllers/habitController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, getHabits);
router.post('/', authMiddleware, createHabit);
router.post('/:id/log', authMiddleware, logHabit);
router.get('/:id/logs', authMiddleware, getHabitLogs);
router.patch('/:id/log/shared', authMiddleware, markHabitLogAsShared);
router.delete('/:id', authMiddleware, deleteHabit);
router.patch('/:id', authMiddleware, updateHabit);
router.post('/auto-fail', authMiddleware, autoFailUnloggedHabits);

export default router;
