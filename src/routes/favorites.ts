import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
} from '../services/favorites';
import { getVenueById } from '../services/venues';

const router = Router();

// All favorites routes require authentication
router.use(authenticate);

/**
 * GET /users/me/favorites
 * Returns the authenticated user's favorited venues.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;
    const favorites = await getUserFavorites(userId);
    res.json({ data: favorites });
  } catch (err) {
    console.error('Error in GET /users/me/favorites:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch favorites',
      statusCode: 500,
    });
  }
});

/**
 * POST /users/me/favorites/:venueId
 * Add a venue to the user's favorites. Returns 201 on success.
 */
router.post('/:venueId', async (req: Request<{ venueId: string }>, res: Response) => {
  try {
    const userId = req.user!.sub;
    const { venueId } = req.params;

    // Verify venue exists
    const venue = await getVenueById(venueId);
    if (!venue) {
      res.status(404).json({
        error: 'Not Found',
        message: `Venue with id '${venueId}' not found`,
        statusCode: 404,
      });
      return;
    }

    await addFavorite(userId, venueId);
    res.status(201).json({ message: 'Favorite added' });
  } catch (err) {
    console.error('Error in POST /users/me/favorites/:venueId:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add favorite',
      statusCode: 500,
    });
  }
});

/**
 * DELETE /users/me/favorites/:venueId
 * Remove a venue from the user's favorites. Returns 204 on success.
 */
router.delete('/:venueId', async (req: Request<{ venueId: string }>, res: Response) => {
  try {
    const userId = req.user!.sub;
    const { venueId } = req.params;

    await removeFavorite(userId, venueId);
    res.status(204).send();
  } catch (err) {
    console.error('Error in DELETE /users/me/favorites/:venueId:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove favorite',
      statusCode: 500,
    });
  }
});

export default router;
