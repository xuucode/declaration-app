import { Router } from 'express';
import {
  getExpenses,
  createExpense,
  addExpenseLog,
  getExpenseLogs,
  deleteExpense,
  updateExpense,
} from '../controllers/expenseController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, getExpenses);
router.post('/', authMiddleware, createExpense);
router.post('/:id/log', authMiddleware, addExpenseLog);
router.get('/:id/logs', authMiddleware, getExpenseLogs);
router.delete('/:id', authMiddleware, deleteExpense);
router.patch('/:id', authMiddleware, updateExpense);

export default router;