import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import declarationsRouter from './routes/declarations.js';
import subscriptionsRouter from './routes/subscriptions.js';
import habitsRouter from './routes/habits.js';
import expensesRouter from './routes/expenses.js';
import contactRouter from './routes/contact.js';
import { securityHeaders } from './middleware/securityHeaders.js';

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

app.use(securityHeaders);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// WebhookはJSON解析前に生のbodyで受け取る
app.use('/subscriptions/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/declarations', declarationsRouter);
app.use('/subscriptions', subscriptionsRouter);
app.use('/habits', habitsRouter);
app.use('/expenses', expensesRouter);
app.use('/contact', contactRouter);

export default app;
