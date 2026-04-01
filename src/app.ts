import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import dealsRouter from './routes/deals';
import venuesRouter from './routes/venues';
import favoritesRouter from './routes/favorites';
import adminRouter from './routes/admin';
import imageRouter from './routes/images';
import searchRouter from './routes/search';
import notificationsRouter from './routes/notifications';
import ownerRouter from './routes/owners';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
app.use('/deals', dealsRouter);
app.use('/venues', venuesRouter);
app.use('/users/me/favorites', favoritesRouter);
app.use('/admin', adminRouter);
app.use('/admin', imageRouter);
app.use('/search', searchRouter);
app.use('/owners', ownerRouter);
app.use('/notifications', notificationsRouter);

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
