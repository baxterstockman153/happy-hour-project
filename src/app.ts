import express from 'express';
import dotenv from 'dotenv';
import authRouter from './routes/auth';

dotenv.config();

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
// app.use('/deals', dealsRouter);
// app.use('/venues', venuesRouter);
// app.use('/users/me/favorites', favoritesRouter);
// app.use('/admin', adminRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route not found', statusCode: 404 });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message, statusCode: 500 });
});

export default app;
