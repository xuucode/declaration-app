import { Router } from 'express';
import {
  createCheckoutSession,
  confirmCheckoutSession,
  cancelSubscription,
  handleWebhook,
} from '../controllers/subscriptionController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Webhookは生のbodyが必要なので認証なし・express.rawで受け取る
router.post('/webhook', handleWebhook);

router.post('/checkout', authMiddleware, createCheckoutSession);
router.post('/confirm', authMiddleware, confirmCheckoutSession);
router.post('/cancel', authMiddleware, cancelSubscription);

export default router;
