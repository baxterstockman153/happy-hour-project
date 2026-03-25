import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { registerPushToken, unregisterPushToken } from '../services/notifications';
import { query } from '../db/connection';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * POST /notifications/push-token
 * Register a device push token for the authenticated user.
 */
router.post('/push-token', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;
    const { token, platform } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing or invalid "token" field',
        statusCode: 400,
      });
      return;
    }

    if (!platform || !['ios', 'android'].includes(platform)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing or invalid "platform" field — must be "ios" or "android"',
        statusCode: 400,
      });
      return;
    }

    await registerPushToken(userId, token, platform);
    res.status(201).json({ message: 'Push token registered' });
  } catch (err) {
    console.error('Error in POST /notifications/push-token:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register push token',
      statusCode: 500,
    });
  }
});

/**
 * DELETE /notifications/push-token
 * Unregister a device push token for the authenticated user.
 */
router.delete('/push-token', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing or invalid "token" field',
        statusCode: 400,
      });
      return;
    }

    await unregisterPushToken(userId, token);
    res.status(204).send();
  } catch (err) {
    console.error('Error in DELETE /notifications/push-token:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to unregister push token',
      statusCode: 500,
    });
  }
});

/**
 * GET /notifications/settings
 * Return the authenticated user's active push tokens (without actual token values).
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;

    const sql = `
      SELECT id, platform, is_active
      FROM push_tokens
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await query<{ id: string; platform: string; is_active: boolean }>(sql, [userId]);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error in GET /notifications/settings:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch notification settings',
      statusCode: 500,
    });
  }
});

export default router;
