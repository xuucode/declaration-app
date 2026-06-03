import { Router } from 'express';
import { register, confirmEmail, login } from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/confirm', confirmEmail);
router.post('/login', login);

export default router;