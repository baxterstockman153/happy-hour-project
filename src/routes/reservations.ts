import { Router, Request, Response } from 'express';
import {
  createReservation,
  getUserReservations,
  cancelReservation,
} from '../services/reservations';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /reservations
 * Create a reservation. Auth is optional — logged-in users get user_id associated.
 */
router.post('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      venue_id,
      deal_id,
      name,
      email,
      phone,
      party_size,
      reservation_date,
      reservation_time,
      special_requests,
    } = req.body;

    if (!venue_id || !name || !email || party_size == null || !reservation_date || !reservation_time) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'venue_id, name, email, party_size, reservation_date, and reservation_time are required',
        statusCode: 400,
      });
      return;
    }

    const size = Number(party_size);
    if (!Number.isInteger(size) || size < 1 || size > 20) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'party_size must be an integer between 1 and 20',
        statusCode: 400,
      });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(reservation_date)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'reservation_date must be in YYYY-MM-DD format',
        statusCode: 400,
      });
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(reservation_time)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'reservation_time must be in HH:MM format',
        statusCode: 400,
      });
      return;
    }

    const reservation = await createReservation(
      {
        venue_id,
        deal_id,
        name,
        email,
        phone,
        party_size: size,
        reservation_date,
        reservation_time,
        special_requests,
      },
      req.user?.sub
    );

    res.status(201).json(reservation);
  } catch (err) {
    console.error('Error in POST /reservations:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create reservation',
      statusCode: 500,
    });
  }
});

/**
 * GET /reservations/me
 * List all reservations for the authenticated user.
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const reservations = await getUserReservations(req.user!.sub);
    res.json({ data: reservations });
  } catch (err) {
    console.error('Error in GET /reservations/me:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch reservations',
      statusCode: 500,
    });
  }
});

/**
 * DELETE /reservations/:id
 * Cancel a reservation.
 */
router.delete('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params['id'] as string;
    const reservation = await cancelReservation(id, req.user?.sub);

    if (!reservation) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Reservation not found or already cancelled',
        statusCode: 404,
      });
      return;
    }

    res.json(reservation);
  } catch (err) {
    console.error('Error in DELETE /reservations/:id:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to cancel reservation',
      statusCode: 500,
    });
  }
});

export default router;
