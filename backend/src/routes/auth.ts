import { Router } from 'express';
import {
  register,
  confirmEmail,
  login,
  changePassword,
  changeEmail,
  forgotPassword,
  confirmForgotPassword,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/confirm', confirmEmail);
router.post('/login', login);
router.post('/change-password', authMiddleware, changePassword);
router.post('/change-email', authMiddleware, changeEmail);
router.post('/forgot-password', forgotPassword);
router.post('/confirm-forgot-password', confirmForgotPassword);

export default router;