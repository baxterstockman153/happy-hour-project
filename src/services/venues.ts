import { query } from '../db/connection';
import { Venue, HappyHourDeal } from '../types';
import { getDealsByVenue } from './deals';

export async function getVenueById(id: string, userId?: string): Promise<(Venue & { is_favorited?: boolean }) | null> {
  const queryParams: unknown[] = [id];

  let favoritedSelect = '';
  if (userId) {
    queryParams.push(userId);
    favoritedSelect = `,\n           CASE WHEN EXISTS (SELECT 1 FROM user_favorites uf WHERE uf.venue_id = $1 AND uf.user_id = $2) THEN TRUE ELSE FALSE END AS is_favorited`;
  }

  const sql = `
    SELECT id, name, address, city, state, zip,
           ST_Y(location::geometry) AS latitude,
           ST_X(location::geometry) AS longitude,
           phone, website, image_url, category,
           created_at, updated_at${favoritedSelect}
    FROM venues
    WHERE id = $1
  `;

  const result = await query<Venue & { is_favorited?: boolean }>(sql, queryParams);
  return result.rows[0] ?? null;
}

export async function getVenueWithDeals(
  id: string,
  userId?: string
): Promise<(Venue & { deals: HappyHourDeal[]; is_favorited?: boolean }) | null> {
  const venue = await getVenueById(id, userId);
  if (!venue) {
    return null;
  }

  const deals = await getDealsByVenue(id);
  return { ...venue, deals };
}
