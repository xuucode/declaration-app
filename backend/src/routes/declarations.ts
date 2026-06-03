import { Router } from 'express';
import {
  getDeclarations,
  createDeclaration,
  getDeclaration,
  updateDeclarationStatus,
} from '../controllers/declarationController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, getDeclarations);
router.post('/', authMiddleware, createDeclaration);
router.get('/:id', getDeclaration);
router.patch('/:id/status', authMiddleware, updateDeclarationStatus);

export default router;