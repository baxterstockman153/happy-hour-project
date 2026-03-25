import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import {
  loginAdmin,
  createVenue,
  updateVenue,
  deleteVenue,
  createDeal,
  updateDeal,
  deleteDeal,
} from '../services/admin';
import { VenueCategory, DealType } from '../types';

const router = Router();

// ── Validation helpers ──

const VALID_CATEGORIES: VenueCategory[] = ['bar', 'restaurant', 'brewery', 'lounge', 'pub', 'winery', 'other'];
const VALID_DEAL_TYPES: DealType[] = ['drinks', 'food', 'both'];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateVenueInput(body: Record<string, unknown>, isUpdate: boolean): string | null {
  if (!isUpdate) {
    // Required fields for creation
    const required = ['name', 'address', 'city', 'state', 'zip', 'latitude', 'longitude', 'category'] as const;
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return `${field} is required`;
      }
    }
  }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return 'name must be a non-empty string';
    }
  }

  if (body.address !== undefined) {
    if (typeof body.address !== 'string' || body.address.trim() === '') {
      return 'address must be a non-empty string';
    }
  }

  if (body.city !== undefined) {
    if (typeof body.city !== 'string' || body.city.trim() === '') {
      return 'city must be a non-empty string';
    }
  }

  if (body.state !== undefined) {
    if (typeof body.state !== 'string' || body.state.trim() === '') {
      return 'state must be a non-empty string';
    }
  }

  if (body.zip !== undefined) {
    if (typeof body.zip !== 'string' || body.zip.trim() === '') {
      return 'zip must be a non-empty string';
    }
  }

  if (body.latitude !== undefined) {
    const lat = Number(body.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return 'latitude must be a number between -90 and 90';
    }
  }

  if (body.longitude !== undefined) {
    const lng = Number(body.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return 'longitude must be a number between -180 and 180';
    }
  }

  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category as VenueCategory)) {
      return `category must be one of: ${VALID_CATEGORIES.join(', ')}`;
    }
  }

  return null;
}

function validateDealInput(body: Record<string, unknown>, isUpdate: boolean): string | null {
  if (!isUpdate) {
    const required = ['day_of_week', 'start_time', 'end_time', 'description', 'deal_type'] as const;
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return `${field} is required`;
      }
    }
  }

  if (body.day_of_week !== undefined) {
    if (!Array.isArray(body.day_of_week)) {
      return 'day_of_week must be an array';
    }
    if (body.day_of_week.length === 0) {
      return 'day_of_week must not be empty';
    }
    for (const day of body.day_of_week) {
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        return 'day_of_week must contain integers between 0 (Sunday) and 6 (Saturday)';
      }
    }
  }

  if (body.start_time !== undefined) {
    if (typeof body.start_time !== 'string' || !TIME_REGEX.test(body.start_time)) {
      return 'start_time must be in HH:MM format (24-hour)';
    }
  }

  if (body.end_time !== undefined) {
    if (typeof body.end_time !== 'string' || !TIME_REGEX.test(body.end_time)) {
      return 'end_time must be in HH:MM format (24-hour)';
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim() === '') {
      return 'description must be a non-empty string';
    }
  }

  if (body.deal_type !== undefined) {
    if (!VALID_DEAL_TYPES.includes(body.deal_type as DealType)) {
      return `deal_type must be one of: ${VALID_DEAL_TYPES.join(', ')}`;
    }
  }

  return null;
}

// ── Auth Routes ──

/**
 * POST /admin/login
 * Authenticate an admin user and return tokens with role claim.
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
        statusCode: 400,
      });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format',
        statusCode: 400,
      });
      return;
    }

    const tokens = await loginAdmin(email, password);

    if (!tokens) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
        statusCode: 401,
      });
      return;
    }

    res.status(200).json(tokens);
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to log in',
      statusCode: 500,
    });
  }
});

// ── Venue Routes (require admin auth) ──

/**
 * POST /admin/venues
 * Create a new venue.
 */
router.post('/venues', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const validationError = validateVenueInput(req.body, false);
    if (validationError) {
      res.status(400).json({
        error: 'Bad Request',
        message: validationError,
        statusCode: 400,
      });
      return;
    }

    const venue = await createVenue({
      name: req.body.name,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      zip: req.body.zip,
      latitude: Number(req.body.latitude),
      longitude: Number(req.body.longitude),
      phone: req.body.phone,
      website: req.body.website,
      image_url: req.body.image_url,
      category: req.body.category,
    });

    res.status(201).json(venue);
  } catch (err) {
    console.error('Create venue error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create venue',
      statusCode: 500,
    });
  }
});

/**
 * PUT /admin/venues/:id
 * Update an existing venue.
 */
router.put('/venues/:id', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const validationError = validateVenueInput(req.body, true);
    if (validationError) {
      res.status(400).json({
        error: 'Bad Request',
        message: validationError,
        statusCode: 400,
      });
      return;
    }

    const input: Record<string, unknown> = {};
    const fields = ['name', 'address', 'city', 'state', 'zip', 'phone', 'website', 'image_url', 'category'] as const;
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        input[field] = req.body[field];
      }
    }
    if (req.body.latitude !== undefined) {
      input.latitude = Number(req.body.latitude);
    }
    if (req.body.longitude !== undefined) {
      input.longitude = Number(req.body.longitude);
    }

    const venueId = req.params.id as string;
    const venue = await updateVenue(venueId, input);

    if (!venue) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Venue not found',
        statusCode: 404,
      });
      return;
    }

    res.status(200).json(venue);
  } catch (err) {
    console.error('Update venue error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update venue',
      statusCode: 500,
    });
  }
});

/**
 * DELETE /admin/venues/:id
 * Delete a venue and its cascaded deals.
 */
router.delete('/venues/:id', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const venueId = req.params.id as string;
    const deleted = await deleteVenue(venueId);

    if (!deleted) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Venue not found',
        statusCode: 404,
      });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Delete venue error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete venue',
      statusCode: 500,
    });
  }
});

// ── Deal Routes (require admin auth) ──

/**
 * POST /admin/venues/:id/deals
 * Create a deal for a specific venue.
 */
router.post('/venues/:id/deals', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const validationError = validateDealInput(req.body, false);
    if (validationError) {
      res.status(400).json({
        error: 'Bad Request',
        message: validationError,
        statusCode: 400,
      });
      return;
    }

    const venueId = req.params.id as string;
    const deal = await createDeal(venueId, {
      day_of_week: req.body.day_of_week,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      description: req.body.description,
      deal_type: req.body.deal_type,
      is_active: req.body.is_active,
    });

    if (!deal) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Venue not found',
        statusCode: 404,
      });
      return;
    }

    res.status(201).json(deal);
  } catch (err) {
    console.error('Create deal error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create deal',
      statusCode: 500,
    });
  }
});

/**
 * PUT /admin/deals/:id
 * Update an existing deal.
 */
router.put('/deals/:id', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const validationError = validateDealInput(req.body, true);
    if (validationError) {
      res.status(400).json({
        error: 'Bad Request',
        message: validationError,
        statusCode: 400,
      });
      return;
    }

    const input: Record<string, unknown> = {};
    const fields = ['day_of_week', 'start_time', 'end_time', 'description', 'deal_type', 'is_active'] as const;
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        input[field] = req.body[field];
      }
    }

    const dealId = req.params.id as string;
    const deal = await updateDeal(dealId, input);

    if (!deal) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Deal not found',
        statusCode: 404,
      });
      return;
    }

    res.status(200).json(deal);
  } catch (err) {
    console.error('Update deal error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update deal',
      statusCode: 500,
    });
  }
});

/**
 * DELETE /admin/deals/:id
 * Delete a deal.
 */
router.delete('/deals/:id', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dealId = req.params.id as string;
    const deleted = await deleteDeal(dealId);

    if (!deleted) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Deal not found',
        statusCode: 404,
      });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Delete deal error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete deal',
      statusCode: 500,
    });
  }
});

export default router;
