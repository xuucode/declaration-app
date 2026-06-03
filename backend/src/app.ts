import express from 'express';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import declarationsRouter from './routes/declarations.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/declarations', declarationsRouter);

export default app;