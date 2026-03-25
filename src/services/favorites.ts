import { query } from '../db/connection';
import { Venue } from '../types';

export async function getUserFavorites(userId: string): Promise<Venue[]> {
  const sql = `
    SELECT v.id, v.name, v.address, v.city, v.state, v.zip,
           ST_Y(v.location::geometry) AS latitude,
           ST_X(v.location::geometry) AS longitude,
           v.phone, v.website, v.image_url, v.category,
           v.created_at, v.updated_at
    FROM user_favorites uf
    JOIN venues v ON uf.venue_id = v.id
    WHERE uf.user_id = $1
    ORDER BY uf.created_at DESC
  `;

  const result = await query<Venue>(sql, [userId]);
  return result.rows;
}

export async function addFavorite(userId: string, venueId: string): Promise<void> {
  const sql = `
    INSERT INTO user_favorites (user_id, venue_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `;

  await query(sql, [userId, venueId]);
}

export async function removeFavorite(userId: string, venueId: string): Promise<void> {
  const sql = `
    DELETE FROM user_favorites
    WHERE user_id = $1 AND venue_id = $2
  `;

  await query(sql, [userId, venueId]);
}

export async function isFavorite(userId: string, venueId: string): Promise<boolean> {
  const sql = `
    SELECT 1 FROM user_favorites
    WHERE user_id = $1 AND venue_id = $2
  `;

  const result = await query(sql, [userId, venueId]);
  return result.rows.length > 0;
}
