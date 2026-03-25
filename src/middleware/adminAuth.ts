import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';
import { query } from '../db/connection';

/**
 * Combined admin auth middleware — authenticates the request and verifies
 * the user has admin privileges in a single step.
 * Also checks the admin_users table to confirm the user still exists and is valid.
 */
export async function adminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header',
      statusCode: 401,
    });
    return;
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      statusCode: 401,
    });
    return;
  }

  if (payload.type !== 'access') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token type: expected access token',
      statusCode: 401,
    });
    return;
  }

  if (!payload.role || !['super_admin', 'editor'].includes(payload.role)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions',
      statusCode: 403,
    });
    return;
  }

  // Verify the admin user still exists in the database
  try {
    const result = await query(
      'SELECT id, email, role FROM admin_users WHERE id = $1',
      [payload.sub]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin user no longer exists',
        statusCode: 401,
      });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify admin user',
      statusCode: 500,
    });
  }
}
