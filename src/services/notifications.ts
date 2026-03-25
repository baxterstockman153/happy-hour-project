import { SNSClient, PublishCommand, CreatePlatformEndpointCommand } from '@aws-sdk/client-sns';
import { query } from '../db/connection';
import { PushToken } from '../types/notifications';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SNS_PLATFORM_ARN_IOS = process.env.SNS_PLATFORM_ARN_IOS;
const SNS_PLATFORM_ARN_ANDROID = process.env.SNS_PLATFORM_ARN_ANDROID;

let snsClient: SNSClient | null = null;

function getSnsClient(): SNSClient | null {
  if (!SNS_PLATFORM_ARN_IOS && !SNS_PLATFORM_ARN_ANDROID) {
    return null;
  }
  if (!snsClient) {
    snsClient = new SNSClient({ region: AWS_REGION });
  }
  return snsClient;
}

/**
 * Register a device push token for a user.
 * Inserts into push_tokens table (ON CONFLICT updates platform and sets is_active=true).
 * Optionally creates an SNS platform endpoint.
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android'
): Promise<void> {
  let endpointArn: string | null = null;

  // Optionally create SNS platform endpoint
  const client = getSnsClient();
  if (client) {
    const platformArn = platform === 'ios' ? SNS_PLATFORM_ARN_IOS : SNS_PLATFORM_ARN_ANDROID;
    if (platformArn) {
      try {
        const response = await client.send(
          new CreatePlatformEndpointCommand({
            PlatformApplicationArn: platformArn,
            Token: token,
          })
        );
        endpointArn = response.EndpointArn ?? null;
      } catch (err) {
        console.warn('Failed to create SNS platform endpoint:', err);
      }
    }
  }

  const sql = `
    INSERT INTO push_tokens (user_id, token, platform, endpoint_arn)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, token)
    DO UPDATE SET
      platform = EXCLUDED.platform,
      is_active = true,
      endpoint_arn = COALESCE(EXCLUDED.endpoint_arn, push_tokens.endpoint_arn),
      updated_at = NOW()
  `;

  await query(sql, [userId, token, platform, endpointArn]);
}

/**
 * Unregister a device push token by setting is_active=false.
 */
export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  const sql = `
    UPDATE push_tokens
    SET is_active = false, updated_at = NOW()
    WHERE user_id = $1 AND token = $2
  `;

  await query(sql, [userId, token]);
}

/**
 * Send a push notification to all active tokens for a user via SNS.
 * If SNS is not configured, logs a warning and skips.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const client = getSnsClient();
  if (!client) {
    console.warn('SNS not configured — skipping push notification for user:', userId);
    return;
  }

  const tokensSql = `
    SELECT id, user_id, token, platform, endpoint_arn, is_active, created_at, updated_at
    FROM push_tokens
    WHERE user_id = $1 AND is_active = true
  `;
  const result = await query<PushToken>(tokensSql, [userId]);

  for (const pushToken of result.rows) {
    if (!pushToken.endpoint_arn) {
      console.warn(`No endpoint ARN for push token ${pushToken.id}, skipping`);
      continue;
    }

    const message = JSON.stringify({
      default: body,
      GCM: JSON.stringify({
        notification: { title, body },
        data: data ?? {},
      }),
      APNS: JSON.stringify({
        aps: { alert: { title, body }, sound: 'default' },
        ...data,
      }),
    });

    try {
      await client.send(
        new PublishCommand({
          TargetArn: pushToken.endpoint_arn,
          Message: message,
          MessageStructure: 'json',
        })
      );
    } catch (err) {
      console.error(`Failed to send push to token ${pushToken.id}:`, err);
    }
  }
}

/**
 * Notify all users who favorited a venue that a deal is starting soon.
 */
export async function notifyFavoriteDealStarting(
  venueId: string,
  dealDescription: string
): Promise<void> {
  const sql = `
    SELECT DISTINCT uf.user_id
    FROM user_favorites uf
    JOIN push_tokens pt ON pt.user_id = uf.user_id AND pt.is_active = true
    WHERE uf.venue_id = $1
  `;

  const result = await query<{ user_id: string }>(sql, [venueId]);

  for (const row of result.rows) {
    await sendPushNotification(
      row.user_id,
      'Happy hour starting soon!',
      dealDescription,
      { venue_id: venueId }
    );
  }
}

/**
 * Query deals starting in the next 30 minutes, find users who favorited those venues,
 * and send notifications. Intended to be invoked by a scheduled Lambda/cron.
 */
export async function checkAndNotifyUpcomingDeals(): Promise<void> {
  const sql = `
    SELECT hhd.id, hhd.venue_id, hhd.description, v.name AS venue_name
    FROM happy_hour_deals hhd
    JOIN venues v ON v.id = hhd.venue_id
    WHERE hhd.is_active = true
      AND EXTRACT(DOW FROM NOW()) = ANY(hhd.day_of_week)
      AND hhd.start_time BETWEEN LOCALTIME AND LOCALTIME + INTERVAL '30 minutes'
  `;

  const result = await query<{
    id: string;
    venue_id: string;
    description: string;
    venue_name: string;
  }>(sql);

  for (const deal of result.rows) {
    await notifyFavoriteDealStarting(
      deal.venue_id,
      `${deal.venue_name}: ${deal.description}`
    );
  }
}
