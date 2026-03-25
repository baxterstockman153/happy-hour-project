import { query } from '../db/connection';
import { Venue, HappyHourDeal } from '../types';
import { getDealsByVenue } from './deals';

export async function getVenueById(id: string): Promise<Venue | null> {
  const sql = `
    SELECT id, name, address, city, state, zip,
           ST_Y(location::geometry) AS latitude,
           ST_X(location::geometry) AS longitude,
           phone, website, image_url, category,
           created_at, updated_at
    FROM venues
    WHERE id = $1
  `;

  const result = await query<Venue>(sql, [id]);
  return result.rows[0] ?? null;
}

export async function getVenueWithDeals(
  id: string
): Promise<(Venue & { deals: HappyHourDeal[] }) | null> {
  const venue = await getVenueById(id);
  if (!venue) {
    return null;
  }

  const deals = await getDealsByVenue(id);
  return { ...venue, deals };
}
