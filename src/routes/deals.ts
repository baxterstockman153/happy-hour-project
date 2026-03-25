import { Router, Request, Response } from 'express';
import { getNearbyDeals, getHappeningNow } from '../services/deals';
import { DealType } from '../types';

const router = Router();

/**
 * GET /deals/nearby
 * Query params: lat, lng (required); radius, day, time, deal_type, page, limit (optional)
 */
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, day, time, deal_type, page, limit } = req.query;

    // Validate required params
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

    // Build params object
    const params: {
      lat: number;
      lng: number;
      radius?: number;
      day?: number;
      time?: string;
      deal_type?: DealType;
      page?: number;
      limit?: number;
    } = { lat: latNum, lng: lngNum };

    if (radius !== undefined) {
      const r = parseFloat(radius as string);
      if (isNaN(r) || r <= 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'radius must be a positive number',
          statusCode: 400,
        });
        return;
      }
      params.radius = r;
    }

    if (day !== undefined) {
      const d = parseInt(day as string, 10);
      if (isNaN(d) || d < 0 || d > 6) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'day must be an integer between 0 (Sunday) and 6 (Saturday)',
          statusCode: 400,
        });
        return;
      }
      params.day = d;
    }

    if (time !== undefined) {
      const timeStr = time as string;
      if (!/^\d{2}:\d{2}$/.test(timeStr)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'time must be in HH:MM 24-hour format',
          statusCode: 400,
        });
        return;
      }
      params.time = timeStr;
    }

    if (deal_type !== undefined) {
      const dt = deal_type as string;
      if (!['drinks', 'food', 'both'].includes(dt)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'deal_type must be one of: drinks, food, both',
          statusCode: 400,
        });
        return;
      }
      params.deal_type = dt as DealType;
    }

    if (page !== undefined) {
      const p = parseInt(page as string, 10);
      if (isNaN(p) || p < 1) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'page must be a positive integer',
          statusCode: 400,
        });
        return;
      }
      params.page = p;
    }

    if (limit !== undefined) {
      const l = parseInt(limit as string, 10);
      if (isNaN(l) || l < 1 || l > 100) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'limit must be an integer between 1 and 100',
          statusCode: 400,
        });
        return;
      }
      params.limit = l;
    }

    const result = await getNearbyDeals(params);
    res.json(result);
  } catch (err) {
    console.error('Error in GET /deals/nearby:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch nearby deals',
      statusCode: 500,
    });
  }
});

/**
 * GET /deals/happening-now
 * Query params: lat, lng (required); radius (optional)
 */
router.get('/happening-now', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius } = req.query;

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

    const deals = await getHappeningNow(latNum, lngNum, radiusNum);
    res.json({ data: deals });
  } catch (err) {
    console.error('Error in GET /deals/happening-now:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch happening now deals',
      statusCode: 500,
    });
  }
});

export default router;
