import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { generateUploadUrl, getImageUrl, deleteImage } from '../services/images';
import { query } from '../db/connection';
import { Venue } from '../types';

const router = Router();

/**
 * POST /admin/venues/:id/upload-url
 * Generate a presigned S3 upload URL for a venue image.
 * Body: { content_type: string }
 * Returns: { upload_url: string, image_url: string }
 */
router.post('/venues/:id/upload-url', adminAuth, async (req: Request, res: Response): Promise<void> => {
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

    // Verify venue exists
    const venueResult = await query<Venue>(
      'SELECT id FROM venues WHERE id = $1',
      [venueId]
    );

    if (venueResult.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Venue not found',
        statusCode: 404,
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

/**
 * POST /admin/venues/:id/image
 * Confirm an image upload by saving the image_key to the venue record.
 * Body: { image_key: string }
 * Returns: 200
 */
router.post('/venues/:id/image', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const venueId = req.params.id as string;
    const { image_key } = req.body;

    if (!image_key || typeof image_key !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'image_key is required and must be a string',
        statusCode: 400,
      });
      return;
    }

    const imageUrl = getImageUrl(image_key);

    const result = await query(
      'UPDATE venues SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [imageUrl, venueId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Venue not found',
        statusCode: 404,
      });
      return;
    }

    res.status(200).json({ message: 'Image URL updated successfully' });
  } catch (err) {
    console.error('Confirm image upload error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update venue image',
      statusCode: 500,
    });
  }
});

/**
 * DELETE /admin/venues/:id/image
 * Delete the current venue image from S3 and clear image_url in the database.
 * Returns: 204
 */
router.delete('/venues/:id/image', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const venueId = req.params.id as string;

    // Get current venue with image_url
    const venueResult = await query<Venue>(
      'SELECT id, image_url FROM venues WHERE id = $1',
      [venueId]
    );

    if (venueResult.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Venue not found',
        statusCode: 404,
      });
      return;
    }

    const venue = venueResult.rows[0];

    if (venue.image_url) {
      // Extract the image key from the CloudFront URL
      // URL format: https://${CLOUDFRONT_DOMAIN}/${imageKey}
      const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || '';
      const prefix = `https://${cloudfrontDomain}/`;
      if (venue.image_url.startsWith(prefix)) {
        const imageKey = venue.image_url.slice(prefix.length);
        await deleteImage(imageKey);
      }
    }

    // Set image_url to null
    await query(
      'UPDATE venues SET image_url = NULL, updated_at = NOW() WHERE id = $1',
      [venueId]
    );

    res.status(204).send();
  } catch (err) {
    console.error('Delete venue image error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete venue image',
      statusCode: 500,
    });
  }
});

export default router;
