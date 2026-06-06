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
import { docClient, TABLES } from '../config/dynamodb.js';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

const router = Router();

router.get('/', authMiddleware, getExpenses);
router.post('/', authMiddleware, createExpense);
router.post('/:id/log', authMiddleware, addExpenseLog);
router.get('/:id/logs', authMiddleware, getExpenseLogs);
router.delete('/:id', authMiddleware, deleteExpense);
router.patch('/:id', authMiddleware, updateExpense);
router.patch('/:id/shared', authMiddleware, async (req, res) => {
  const id = req.params['id'] as string;
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.DECLARATIONS,
        Key: { declarationId: id },
        UpdateExpression: 'SET sharedAt = :sharedAt',
        ExpressionAttributeValues: {
          ':sharedAt': new Date().toISOString(),
        },
      })
    );
    res.status(200).json({ message: 'シェア完了を記録しました' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

export default router;