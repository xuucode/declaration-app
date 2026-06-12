import { Router } from 'express';
import { createContact } from '../controllers/contactController.js';
import { createRateLimit } from '../middleware/rateLimit.js';

const router = Router();

const contactRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'お問い合わせの送信回数が多すぎます。時間をおいて再度お試しください。',
});

router.post('/', contactRateLimit, createContact);

export default router;
