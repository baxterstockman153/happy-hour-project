import { Router, Request, Response } from 'express';
import { getVenueWithDeals } from '../services/venues';
import { optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /venues/:id
 * Returns a venue with all its active deals. 404 if not found.
 */
router.get('/:id', optionalAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const venue = await getVenueWithDeals(id, req.user?.sub);

    if (!venue) {
      res.status(404).json({
        error: 'Not Found',
        message: `Venue with id '${id}' not found`,
        statusCode: 404,
      });
      return;
    }

    res.json({ data: venue });
  } catch (err) {
    console.error('Error in GET /venues/:id:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch venue',
      statusCode: 500,
    });
  }
});

export default router;
