import { Router, Request, Response } from 'express';
import { hashPassword, comparePassword, generateTokens, refreshTokens } from '../services/auth';
import { query } from '../db/connection';

const router = Router();

// Basic email format validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST /register
 * Create a new user account and return auth tokens.
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, display_name } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
        statusCode: 400,
      });
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format',
        statusCode: 400,
      });
      return;
    }

    // Validate password length
    if (password.length < 8) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters',
        statusCode: 400,
      });
      return;
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({
        error: 'Conflict',
        message: 'A user with this email already exists',
        statusCode: 409,
      });
      return;
    }

    // Hash password and insert user
    const password_hash = await hashPassword(password);
    const result = await query(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email',
      [email, password_hash, display_name || null]
    );

    const user = result.rows[0];
    const tokens = generateTokens({ sub: user.id, email: user.email });

    res.status(201).json(tokens);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user',
      statusCode: 500,
    });
  }
});

/**
 * POST /login
 * Authenticate a user and return auth tokens.
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
        statusCode: 400,
      });
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format',
        statusCode: 400,
      });
      return;
    }

    // Validate password length
    if (password.length < 8) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters',
        statusCode: 400,
      });
      return;
    }

    // Find user by email
    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
        statusCode: 401,
      });
      return;
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
        statusCode: 401,
      });
      return;
    }

    const tokens = generateTokens({ sub: user.id, email: user.email });

    res.status(200).json(tokens);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to log in',
      statusCode: 500,
    });
  }
});

/**
 * POST /refresh
 * Accept a refresh_token and return a new token pair.
 */
router.post('/refresh', (req: Request, res: Response): void => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'refresh_token is required',
        statusCode: 400,
      });
      return;
    }

    const tokens = refreshTokens(refresh_token);

    res.status(200).json(tokens);
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired refresh token',
      statusCode: 401,
    });
  }
});

export default router;
