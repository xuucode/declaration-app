import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import declarationsRouter from './routes/declarations.js';
import subscriptionsRouter from './routes/subscriptions.js';
import habitsRouter from './routes/habits.js';
import expensesRouter from './routes/expenses.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));

// WebhookはJSON解析前に生のbodyで受け取る
app.use('/subscriptions/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/declarations', declarationsRouter);
app.use('/subscriptions', subscriptionsRouter);
app.use('/habits', habitsRouter);
app.use('/expenses', expensesRouter);

export default app;