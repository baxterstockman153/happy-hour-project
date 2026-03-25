import { query } from '../db/connection';
import {
  NearbyQuery,
  PaginatedResponse,
  DealWithVenue,
  HappyHourDeal,
  DealType,
  VenueCategory,
} from '../types';

const MILES_TO_METERS = 1609.34;
const DEFAULT_RADIUS_MILES = 5;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function getCurrentDay(): number {
  return new Date().getDay();
}

function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

interface DealVenueRow {
  // deal fields
  id: string;
  venue_id: string;
  day_of_week: number[];
  start_time: string;
  end_time: string;
  description: string;
  deal_type: DealType;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  // venue fields (aliased with v_ prefix)
  v_id: string;
  v_name: string;
  v_address: string;
  v_city: string;
  v_state: string;
  v_zip: string;
  v_latitude: number;
  v_longitude: number;
  v_phone: string | null;
  v_website: string | null;
  v_image_url: string | null;
  v_category: VenueCategory;
  v_created_at: Date;
  v_updated_at: Date;
  // computed
  distance_miles: number;
}

function rowToDealWithVenue(row: DealVenueRow): DealWithVenue {
  return {
    id: row.id,
    venue_id: row.venue_id,
    day_of_week: row.day_of_week,
    start_time: row.start_time,
    end_time: row.end_time,
    description: row.description,
    deal_type: row.deal_type,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    venue: {
      id: row.v_id,
      name: row.v_name,
      address: row.v_address,
      city: row.v_city,
      state: row.v_state,
      zip: row.v_zip,
      latitude: row.v_latitude,
      longitude: row.v_longitude,
      phone: row.v_phone,
      website: row.v_website,
      image_url: row.v_image_url,
      category: row.v_category,
      created_at: row.v_created_at,
      updated_at: row.v_updated_at,
      distance_miles: parseFloat(String(row.distance_miles)),
    },
  };
}

export async function getNearbyDeals(
  params: NearbyQuery
): Promise<PaginatedResponse<DealWithVenue>> {
  const {
    lat,
    lng,
    radius = DEFAULT_RADIUS_MILES,
    day = getCurrentDay(),
    time = getCurrentTime(),
    deal_type,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = params;

  const radiusMeters = radius * MILES_TO_METERS;
  const offset = (page - 1) * limit;

  // Build WHERE conditions and params array
  const conditions: string[] = [
    `ST_DWithin(v.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`,
    `$4 = ANY(d.day_of_week)`,
    `d.start_time <= $5::time AND d.end_time >= $5::time`,
    `d.is_active = true`,
  ];
  const queryParams: unknown[] = [lng, lat, radiusMeters, day, time];

  if (deal_type) {
    queryParams.push(deal_type);
    conditions.push(`d.deal_type = $${queryParams.length}`);
  }

  const whereClause = conditions.join(' AND ');

  // Count query
  const countSql = `
    SELECT COUNT(*) as total
    FROM happy_hour_deals d
    JOIN venues v ON d.venue_id = v.id
    WHERE ${whereClause}
  `;
  const countResult = await query<{ total: string }>(countSql, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Data query
  const limitParamIdx = queryParams.length + 1;
  const offsetParamIdx = queryParams.length + 2;

  const dataSql = `
    SELECT
      d.id, d.venue_id, d.day_of_week, d.start_time::text, d.end_time::text,
      d.description, d.deal_type, d.is_active, d.created_at, d.updated_at,
      v.id AS v_id, v.name AS v_name, v.address AS v_address,
      v.city AS v_city, v.state AS v_state, v.zip AS v_zip,
      ST_Y(v.location::geometry) AS v_latitude,
      ST_X(v.location::geometry) AS v_longitude,
      v.phone AS v_phone, v.website AS v_website, v.image_url AS v_image_url,
      v.category AS v_category, v.created_at AS v_created_at, v.updated_at AS v_updated_at,
      ST_Distance(v.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1609.34 AS distance_miles
    FROM happy_hour_deals d
    JOIN venues v ON d.venue_id = v.id
    WHERE ${whereClause}
    ORDER BY distance_miles
    LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
  `;

  const dataResult = await query<DealVenueRow>(dataSql, [
    ...queryParams,
    limit,
    offset,
  ]);

  return {
    data: dataResult.rows.map(rowToDealWithVenue),
    page,
    limit,
    total,
  };
}

export async function getHappeningNow(
  lat: number,
  lng: number,
  radius: number = DEFAULT_RADIUS_MILES
): Promise<DealWithVenue[]> {
  const radiusMeters = radius * MILES_TO_METERS;
  const day = getCurrentDay();
  const time = getCurrentTime();

  const sql = `
    SELECT
      d.id, d.venue_id, d.day_of_week, d.start_time::text, d.end_time::text,
      d.description, d.deal_type, d.is_active, d.created_at, d.updated_at,
      v.id AS v_id, v.name AS v_name, v.address AS v_address,
      v.city AS v_city, v.state AS v_state, v.zip AS v_zip,
      ST_Y(v.location::geometry) AS v_latitude,
      ST_X(v.location::geometry) AS v_longitude,
      v.phone AS v_phone, v.website AS v_website, v.image_url AS v_image_url,
      v.category AS v_category, v.created_at AS v_created_at, v.updated_at AS v_updated_at,
      ST_Distance(v.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1609.34 AS distance_miles
    FROM happy_hour_deals d
    JOIN venues v ON d.venue_id = v.id
    WHERE ST_DWithin(v.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      AND $4 = ANY(d.day_of_week)
      AND d.start_time <= $5::time AND d.end_time >= $5::time
      AND d.is_active = true
    ORDER BY distance_miles
  `;

  const result = await query<DealVenueRow>(sql, [lng, lat, radiusMeters, day, time]);
  return result.rows.map(rowToDealWithVenue);
}

export async function getDealsByVenue(venueId: string): Promise<HappyHourDeal[]> {
  const sql = `
    SELECT id, venue_id, day_of_week, start_time::text, end_time::text,
           description, deal_type, is_active, created_at, updated_at
    FROM happy_hour_deals
    WHERE venue_id = $1 AND is_active = true
    ORDER BY day_of_week, start_time
  `;

  const result = await query<HappyHourDeal>(sql, [venueId]);
  return result.rows;
}
