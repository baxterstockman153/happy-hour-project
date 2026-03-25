import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';
import { JwtPayload } from '../types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authenticate middleware — extracts Bearer token from Authorization header,
 * verifies it, and attaches the decoded JwtPayload to req.user.
 * Returns 401 on missing or invalid token.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header',
      statusCode: 401,
    });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token type: expected access token',
        statusCode: 401,
      });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      statusCode: 401,
    });
  }
}

/**
 * requireAdmin middleware — must be used after authenticate.
 * Verifies the user's role is 'super_admin' or 'editor'.
 * Returns 403 on insufficient role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user || !user.role || !['super_admin', 'editor'].includes(user.role)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions',
      statusCode: 403,
    });
    return;
  }

  next();
}
