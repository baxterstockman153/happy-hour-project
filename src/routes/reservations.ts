import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.use(optionalAuth);

/**
 * POST /reservations
 * Create a reservation for a happy hour deal.
 * Logs what would be saved to the database (no DB write yet).
 */
router.post('/', async (req: Request, res: Response) => {
  const {
    deal_id,
    venue_id,
    venue_name,
    date,
    party_size,
    name,
    email,
    phone,
    special_requests,
  } = req.body;

  if (!deal_id || !venue_id || !date || !party_size || !name || !email) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required fields: deal_id, venue_id, date, party_size, name, email',
      statusCode: 400,
    });
    return;
  }

  const parsedPartySize = Number(party_size);
  if (!Number.isInteger(parsedPartySize) || parsedPartySize < 1 || parsedPartySize > 20) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'party_size must be between 1 and 20',
      statusCode: 400,
    });
    return;
  }

  const userId = req.user?.sub ?? null;
  const confirmationCode = `HH-${Date.now().toString(36).toUpperCase()}`;

  const reservationRecord = {
    id: confirmationCode,
    deal_id,
    venue_id,
    user_id: userId,
    date,
    party_size: parsedPartySize,
    name,
    email,
    phone: phone ?? null,
    special_requests: special_requests ?? null,
    status: 'confirmed',
    created_at: new Date().toISOString(),
  };

  console.log('[RESERVATION] Would save to database:', JSON.stringify(reservationRecord, null, 2));

  res.status(201).json({
    message: 'Reservation confirmed',
    reservation: {
      id: confirmationCode,
      venue_name: venue_name ?? null,
      date,
      party_size: parsedPartySize,
      name,
      email,
      status: 'confirmed',
    },
  });
});

export default router;
