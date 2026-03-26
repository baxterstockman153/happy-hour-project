import { Router, Request, Response } from 'express';
import { searchVenues, getFilteredDeals, getDealsByDay } from '../services/search';
import { optionalAuth } from '../middleware/auth';
import { DealType, VenueCategory } from '../types';

const router = Router();
router.use(optionalAuth);

const VALID_CATEGORIES: VenueCategory[] = [
  'bar', 'restaurant', 'brewery', 'lounge', 'pub', 'winery', 'other',
];
const VALID_DEAL_TYPES: DealType[] = ['drinks', 'food', 'both'];
const TIME_REGEX = /^\d{2}:\d{2}$/;

/**
 * GET /search/venues
 * Query params: q (required), lat, lng, radius, category, page, limit
 */
router.get('/venues', async (req: Request, res: Response) => {
  try {
    const { q, lat, lng, radius, category, page, limit } = req.query;

    // q is required
    if (!q || (typeof q === 'string' && q.trim().length === 0)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'q query parameter is required',
        statusCode: 400,
      });
      return;
    }

    const searchQuery = (q as string).trim();

    // Parse optional lat/lng
    let latNum: number | undefined;
    let lngNum: number | undefined;

    if (lat !== undefined || lng !== undefined) {
      if (lat === undefined || lng === undefined) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'lat and lng must both be provided together',
          statusCode: 400,
        });
        return;
      }

      latNum = parseFloat(lat as string);
      lngNum = parseFloat(lng as string);

      if (isNaN(latNum) || isNaN(lngNum)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'lat and lng must be valid numbers',
          statusCode: 400,
        });
        return;
      }

      if (latNum < -90 || latNum > 90) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'lat must be between -90 and 90',
          statusCode: 400,
        });
        return;
      }

      if (lngNum < -180 || lngNum > 180) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'lng must be between -180 and 180',
          statusCode: 400,
        });
        return;
      }
    }

    // Parse optional radius
    let radiusNum: number | undefined;
    if (radius !== undefined) {
      radiusNum = parseFloat(radius as string);
      if (isNaN(radiusNum) || radiusNum <= 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'radius must be a positive number',
          statusCode: 400,
        });
        return;
      }
    }

    // Parse optional category
    let categoryVal: VenueCategory | undefined;
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category as VenueCategory)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
          statusCode: 400,
        });
        return;
      }
      categoryVal = category as VenueCategory;
    }

    // Parse optional page
    let pageNum: number | undefined;
    if (page !== undefined) {
      pageNum = parseInt(page as string, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'page must be a positive integer',
          statusCode: 400,
        });
        return;
      }
    }

    // Parse optional limit
    let limitNum: number | undefined;
    if (limit !== undefined) {
      limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'limit must be an integer between 1 and 100',
          statusCode: 400,
        });
        return;
      }
    }

    const result = await searchVenues({
      query: searchQuery,
      lat: latNum,
      lng: lngNum,
      radius: radiusNum,
      category: categoryVal,
      page: pageNum,
      limit: limitNum,
    });

    res.json(result);
  } catch (err) {
    console.error('Error in GET /search/venues:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search venues',
      statusCode: 500,
    });
  }
});

/**
 * GET /search/deals
 * Query params: lat, lng (required), radius, days, start_time, end_time,
 *               deal_type, category, sort_by, page, limit
 */
router.get('/deals', async (req: Request, res: Response) => {
  try {
    const {
      lat, lng, radius, days, start_time, end_time,
      deal_type, category, sort_by, page, limit,
    } = req.query;

    // lat and lng are required
    if (lat === undefined || lng === undefined) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'lat and lng query parameters are required',
        statusCode: 400,
      });
      return;
    }

    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);

    if (isNaN(latNum) || isNaN(lngNum)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'lat and lng must be valid numbers',
        statusCode: 400,
      });
      return;
    }

    if (latNum < -90 || latNum > 90) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'lat must be between -90 and 90',
        statusCode: 400,
      });
      return;
    }

    if (lngNum < -180 || lngNum > 180) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'lng must be between -180 and 180',
        statusCode: 400,
      });
      return;
    }

    // Parse optional radius
    let radiusNum: number | undefined;
    if (radius !== undefined) {
      radiusNum = parseFloat(radius as string);
      if (isNaN(radiusNum) || radiusNum <= 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'radius must be a positive number',
          statusCode: 400,
        });
        return;
      }
    }

    // Parse optional days (comma-separated, e.g., "1,2,3")
    let dayArr: number[] | undefined;
    if (days !== undefined) {
      const daysStr = days as string;
      const parts = daysStr.split(',');
      dayArr = [];
      for (const part of parts) {
        const d = parseInt(part.trim(), 10);
        if (isNaN(d) || d < 0 || d > 6) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'days must be comma-separated integers between 0 (Sunday) and 6 (Saturday)',
            statusCode: 400,
          });
          return;
        }
        dayArr.push(d);
      }
    }

    // Parse optional start_time
    let startTimeVal: string | undefined;
    if (start_time !== undefined) {
      const st = start_time as string;
      if (!TIME_REGEX.test(st)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'start_time must be in HH:MM 24-hour format',
          statusCode: 400,
        });
        return;
      }
      startTimeVal = st;
    }

    // Parse optional end_time
    let endTimeVal: string | undefined;
    if (end_time !== undefined) {
      const et = end_time as string;
      if (!TIME_REGEX.test(et)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'end_time must be in HH:MM 24-hour format',
          statusCode: 400,
        });
        return;
      }
      endTimeVal = et;
    }

    // Parse optional deal_type
    let dealTypeVal: DealType | undefined;
    if (deal_type !== undefined) {
      if (!VALID_DEAL_TYPES.includes(deal_type as DealType)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `deal_type must be one of: ${VALID_DEAL_TYPES.join(', ')}`,
          statusCode: 400,
        });
        return;
      }
      dealTypeVal = deal_type as DealType;
    }

    // Parse optional category
    let categoryVal: VenueCategory | undefined;
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category as VenueCategory)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
          statusCode: 400,
        });
        return;
      }
      categoryVal = category as VenueCategory;
    }

    // Parse optional sort_by
    let sortByVal: 'distance' | 'start_time' | undefined;
    if (sort_by !== undefined) {
      if (sort_by !== 'distance' && sort_by !== 'start_time') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'sort_by must be one of: distance, start_time',
          statusCode: 400,
        });
        return;
      }
      sortByVal = sort_by as 'distance' | 'start_time';
    }

    // Parse optional page
    let pageNum: number | undefined;
    if (page !== undefined) {
      pageNum = parseInt(page as string, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'page must be a positive integer',
          statusCode: 400,
        });
        return;
      }
    }

    // Parse optional limit
    let limitNum: number | undefined;
    if (limit !== undefined) {
      limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'limit must be an integer between 1 and 100',
          statusCode: 400,
        });
        return;
      }
    }

    const result = await getFilteredDeals({
      lat: latNum,
      lng: lngNum,
      radius: radiusNum,
      day: dayArr,
      start_time: startTimeVal,
      end_time: endTimeVal,
      deal_type: dealTypeVal,
      category: categoryVal,
      sort_by: sortByVal,
      page: pageNum,
      limit: limitNum,
    }, req.user?.sub);

    res.json(result);
  } catch (err) {
    console.error('Error in GET /search/deals:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search deals',
      statusCode: 500,
    });
  }
});

/**
 * GET /search/deals/by-day/:day
 * Get all active deals for a specific day (0-6). No location needed.
 */
router.get('/deals/by-day/:day', async (req: Request<{ day: string }>, res: Response) => {
  try {
    const dayParam = parseInt(req.params.day, 10);

    if (isNaN(dayParam) || dayParam < 0 || dayParam > 6) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'day must be an integer between 0 (Sunday) and 6 (Saturday)',
        statusCode: 400,
      });
      return;
    }

    const deals = await getDealsByDay(dayParam);
    res.json({ data: deals });
  } catch (err) {
    console.error('Error in GET /search/deals/by-day/:day:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch deals by day',
      statusCode: 500,
    });
  }
});

export default router;
