import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';
import { query } from '../db/connection';

/**
 * Combined owner auth middleware — authenticates the request and verifies
 * the user has venue_owner privileges in a single step.
 * Also checks the venue_owners table to confirm the user still exists and is not suspended.
 */
export async function ownerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  if (payload.role !== 'venue_owner') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions',
      statusCode: 403,
    });
    return;
  }

  // Verify the venue owner still exists and is not suspended
  try {
    const result = await query(
      'SELECT id, email FROM venue_owners WHERE id = $1 AND is_suspended = FALSE',
      [payload.sub]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Venue owner no longer exists or is suspended',
        statusCode: 401,
      });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify venue owner',
      statusCode: 500,
    });
  }
}

/**
 * Middleware that checks the venue_ownership table to confirm the authenticated
 * user owns the venue specified by req.params.id.
 * Must be used after ownerAuth so that req.user is populated.
 */
export async function requireVenueOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await query(
      'SELECT 1 FROM venue_ownership WHERE venue_owner_id = $1 AND venue_id = $2',
      [req.user!.sub, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not own this venue',
        statusCode: 403,
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify venue ownership',
      statusCode: 500,
    });
  }
}
