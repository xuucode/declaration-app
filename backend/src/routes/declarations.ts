import { Router } from 'express';
import {
  getDeclarations,
  createDeclaration,
  getDeclaration,
  updateDeclarationStatus,
  markAsShared,
  markAsPublicShared,
} from '../controllers/declarationController.js';
import { authMiddleware } from '../middleware/auth.js';


const router = Router();

router.get('/', authMiddleware, getDeclarations);
router.post('/', authMiddleware, createDeclaration);
router.get('/:id', getDeclaration);
router.patch('/:id/status', authMiddleware, updateDeclarationStatus);
router.patch('/:id/public-shared', authMiddleware, markAsPublicShared);
router.patch('/:id/shared', authMiddleware, markAsShared);

export default router;
