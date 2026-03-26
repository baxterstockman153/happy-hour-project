import { Router, Request, Response } from 'express';
import { ownerAuth, requireVenueOwnership } from '../middleware/ownerAuth';
import {
  registerOwner,
  loginOwner,
  getOwnerVenues,
  createOwnerVenue,
  updateOwnerVenue,
  createOwnerDeal,
  updateOwnerDeal,
  deleteOwnerDeal,
} from '../services/owners';
import { generateUploadUrl, getImageUrl } from '../services/images';
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
 * POST /owners/register
 * Register a new venue owner account.
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, business_name, contact_name, phone } = req.body;

    if (!email || !password || !business_name || !contact_name) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'email, password, business_name, and contact_name are required',
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

    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters',
        statusCode: 400,
      });
      return;
    }

    if (typeof business_name !== 'string' || business_name.trim() === '') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'business_name must be a non-empty string',
        statusCode: 400,
      });
      return;
    }

    if (typeof contact_name !== 'string' || contact_name.trim() === '') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'contact_name must be a non-empty string',
        statusCode: 400,
      });
      return;
    }

    const result = await registerOwner({ email, password, business_name, contact_name, phone });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message.includes('already in use')) {
      res.status(409).json({
        error: 'Conflict',
        message: err.message,
        statusCode: 409,
      });
      return;
    }
    console.error('Owner registration error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register',
      statusCode: 500,
    });
  }
});

/**
 * POST /owners/login
 * Authenticate a venue owner and return tokens.
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

    const result = await loginOwner(email, password);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Invalid email or password') {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
          statusCode: 401,
        });
        return;
      }
      if (err.message === 'Account is suspended') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Account is suspended',
          statusCode: 403,
        });
        return;
      }
    }
    console.error('Owner login error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to log in',
      statusCode: 500,
    });
  }
});

// ── Venue Routes (require owner auth) ──

/**
 * GET /owners/me/venues
 * List all venues owned by the authenticated owner.
 */
router.get('/me/venues', ownerAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const ownerId = req.user!.sub;
    const venues = await getOwnerVenues(ownerId);

    res.status(200).json(venues);
  } catch (err) {
    console.error('Get owner venues error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve venues',
      statusCode: 500,
    });
  }
});

/**
 * POST /owners/me/venues
 * Create a new venue for the authenticated owner.
 */
router.post('/me/venues', ownerAuth, async (req: Request, res: Response): Promise<void> => {
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

    const ownerId = req.user!.sub;
    const venue = await createOwnerVenue(ownerId, {
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
    console.error('Create owner venue error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create venue',
      statusCode: 500,
    });
  }
});

/**
 * PUT /owners/me/venues/:id
 * Update a venue owned by the authenticated owner.
 */
router.put('/me/venues/:id', ownerAuth, requireVenueOwnership, async (req: Request, res: Response): Promise<void> => {
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
    const ownerId = req.user!.sub;
    const venue = await updateOwnerVenue(ownerId, venueId, input);

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
    console.error('Update owner venue error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update venue',
      statusCode: 500,
    });
  }
});

// ── Deal Routes (require owner auth) ──

/**
 * POST /owners/me/venues/:id/deals
 * Create a deal for a venue owned by the authenticated owner.
 */
router.post('/me/venues/:id/deals', ownerAuth, requireVenueOwnership, async (req: Request, res: Response): Promise<void> => {
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
    const ownerId = req.user!.sub;
    const deal = await createOwnerDeal(ownerId, venueId, {
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
    console.error('Create owner deal error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create deal',
      statusCode: 500,
    });
  }
});

/**
 * PUT /owners/me/deals/:id
 * Update an existing deal (ownership checked in service).
 */
router.put('/me/deals/:id', ownerAuth, async (req: Request, res: Response): Promise<void> => {
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
    const ownerId = req.user!.sub;
    const deal = await updateOwnerDeal(ownerId, dealId, input);

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
    console.error('Update owner deal error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update deal',
      statusCode: 500,
    });
  }
});

/**
 * DELETE /owners/me/deals/:id
 * Delete a deal (ownership checked in service).
 */
router.delete('/me/deals/:id', ownerAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dealId = req.params.id as string;
    const ownerId = req.user!.sub;
    const deleted = await deleteOwnerDeal(ownerId, dealId);

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
    console.error('Delete owner deal error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete deal',
      statusCode: 500,
    });
  }
});

// ── Image Routes ──

/**
 * POST /owners/me/venues/:id/images
 * Generate a presigned S3 upload URL for a venue image.
 */
router.post('/me/venues/:id/images', ownerAuth, requireVenueOwnership, async (req: Request, res: Response): Promise<void> => {
  try {
    const venueId = req.params.id as string;
    const { content_type } = req.body;

    if (!content_type) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'content_type is required',
        statusCode: 400,
      });
      return;
    }

    let result;
    try {
      result = await generateUploadUrl(venueId, content_type);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Invalid content type')) {
        res.status(400).json({
          error: 'Bad Request',
          message: err.message,
          statusCode: 400,
        });
        return;
      }
      throw err;
    }

    const imageUrl = getImageUrl(result.imageKey);

    res.status(200).json({
      upload_url: result.uploadUrl,
      image_url: imageUrl,
    });
  } catch (err) {
    console.error('Generate upload URL error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate upload URL',
      statusCode: 500,
    });
  }
});

export default router;
