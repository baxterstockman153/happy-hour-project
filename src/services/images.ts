import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

const CONTENT_TYPE_EXTENSIONS: Record<AllowedContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const S3_BUCKET = process.env.S3_BUCKET || '';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';
const s3Enabled = !!(process.env.S3_BUCKET && process.env.S3_BUCKET !== '');

function isAllowedContentType(contentType: string): contentType is AllowedContentType {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType);
}

/**
 * Generate a presigned PUT URL for uploading an image to S3.
 * Key format: venues/${venueId}/${uuid}.${extension}
 * Expires in 15 minutes.
 */
export async function generateUploadUrl(
  venueId: string,
  contentType: string
): Promise<{ uploadUrl: string; imageKey: string }> {
  if (!s3Enabled) {
    throw new Error('S3 image uploads are not configured (S3_BUCKET is not set)');
  }
  if (!isAllowedContentType(contentType)) {
    throw new Error(
      `Invalid content type: ${contentType}. Allowed types: ${ALLOWED_CONTENT_TYPES.join(', ')}`
    );
  }

  const extension = CONTENT_TYPE_EXTENSIONS[contentType];
  const imageKey = `venues/${venueId}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: imageKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 minutes

  return { uploadUrl, imageKey };
}

/**
 * Return the CloudFront URL for a given image key.
 */
export function getImageUrl(imageKey: string): string {
  return `https://${CLOUDFRONT_DOMAIN}/${imageKey}`;
}

/**
 * Delete an object from S3.
 */
export async function deleteImage(imageKey: string): Promise<void> {
  if (!s3Enabled) {
    console.warn('S3 not configured — skipping image deletion for key:', imageKey);
    return;
  }
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: imageKey,
  });

  await s3Client.send(command);
}
