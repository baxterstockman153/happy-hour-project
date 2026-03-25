import { query } from '../db/connection';
import {
  PaginatedResponse,
  DealWithVenue,
  HappyHourDeal,
  DealType,
  VenueCategory,
  Venue,
  VenueWithDistance,
} from '../types';

const MILES_TO_METERS = 1609.34;
const DEFAULT_RADIUS_MILES = 5;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

// ── Row types ──

interface VenueRow {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  image_url: string | null;
  category: VenueCategory;
  created_at: Date;
  updated_at: Date;
  distance_miles?: number;
}

interface DealVenueRow {
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
  distance_miles: number;
}

// ── Helpers ──

function rowToVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    website: row.website,
    image_url: row.image_url,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToVenueWithDistance(row: VenueRow): VenueWithDistance {
  return {
    ...rowToVenue(row),
    distance_miles: parseFloat(String(row.distance_miles)),
  };
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

// ── Search venues ──

interface SearchVenuesParams {
  query: string;
  lat?: number;
  lng?: number;
  radius?: number;
  category?: VenueCategory;
  page?: number;
  limit?: number;
}

export async function searchVenues(
  params: SearchVenuesParams
): Promise<PaginatedResponse<VenueWithDistance | Venue>> {
  const {
    query: searchQuery,
    lat,
    lng,
    radius = DEFAULT_RADIUS_MILES,
    category,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = params;

  const offset = (page - 1) * limit;
  const pattern = `%${searchQuery}%`;
  const hasLocation = lat !== undefined && lng !== undefined;

  const conditions: string[] = [
    `(v.name ILIKE $1 OR v.address ILIKE $1)`,
  ];
  const queryParams: unknown[] = [pattern];

  if (hasLocation) {
    const radiusMeters = radius * MILES_TO_METERS;
    queryParams.push(lng, lat, radiusMeters);
    conditions.push(
      `ST_DWithin(v.location, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)`
    );
  }

  if (category) {
    queryParams.push(category);
    conditions.push(`v.category = $${queryParams.length}`);
  }

  const whereClause = conditions.join(' AND ');

  // Count query
  const countSql = `
    SELECT COUNT(*) AS total
    FROM venues v
    WHERE ${whereClause}
  `;
  const countResult = await query<{ total: string }>(countSql, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Data query
  const limitIdx = queryParams.length + 1;
  const offsetIdx = queryParams.length + 2;

  const latSelect = hasLocation
    ? `ST_Y(v.location::geometry) AS latitude, ST_X(v.location::geometry) AS longitude,`
    : `v.latitude, v.longitude,`;
  const orderBy = hasLocation ? 'distance_miles' : 'v.name';

  const dataSql = `
    SELECT
      v.id, v.name, v.address, v.city, v.state, v.zip,
      ${latSelect}
      v.phone, v.website, v.image_url, v.category,
      v.created_at, v.updated_at
      ${hasLocation ? `, ST_Distance(v.location, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) / 1609.34 AS distance_miles` : ''}
    FROM venues v
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const dataResult = await query<VenueRow>(dataSql, [
    ...queryParams,
    limit,
    offset,
  ]);

  const data = hasLocation
    ? dataResult.rows.map(rowToVenueWithDistance)
    : dataResult.rows.map(rowToVenue);

  return { data, page, limit, total };
}

// ── Filtered deals ──

interface GetFilteredDealsParams {
  lat: number;
  lng: number;
  radius?: number;
  day?: number[];
  start_time?: string;
  end_time?: string;
  deal_type?: DealType;
  category?: VenueCategory;
  sort_by?: 'distance' | 'start_time';
  page?: number;
  limit?: number;
}

export async function getFilteredDeals(
  params: GetFilteredDealsParams
): Promise<PaginatedResponse<DealWithVenue>> {
  const {
    lat,
    lng,
    radius = DEFAULT_RADIUS_MILES,
    day,
    start_time,
    end_time,
    deal_type,
    category,
    sort_by = 'distance',
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = params;

  const radiusMeters = radius * MILES_TO_METERS;
  const offset = (page - 1) * limit;

  const conditions: string[] = [
    `ST_DWithin(v.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)`,
    `d.is_active = true`,
  ];
  const queryParams: unknown[] = [lng, lat, radiusMeters];

  // Multiple days filter: deal matches if any of its day_of_week entries overlap with requested days
  if (day && day.length > 0) {
    queryParams.push(day);
    conditions.push(`d.day_of_week && $${queryParams.length}`);
  }

  // Time range filter
  if (start_time) {
    queryParams.push(start_time);
    conditions.push(`d.end_time >= $${queryParams.length}::time`);
  }
  if (end_time) {
    queryParams.push(end_time);
    conditions.push(`d.start_time <= $${queryParams.length}::time`);
  }

  if (deal_type) {
    queryParams.push(deal_type);
    conditions.push(`d.deal_type = $${queryParams.length}`);
  }

  if (category) {
    queryParams.push(category);
    conditions.push(`v.category = $${queryParams.length}`);
  }

  const whereClause = conditions.join(' AND ');

  // Count query
  const countSql = `
    SELECT COUNT(*) AS total
    FROM happy_hour_deals d
    JOIN venues v ON d.venue_id = v.id
    WHERE ${whereClause}
  `;
  const countResult = await query<{ total: string }>(countSql, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Data query
  const limitIdx = queryParams.length + 1;
  const offsetIdx = queryParams.length + 2;

  const orderBy = sort_by === 'start_time' ? 'd.start_time' : 'distance_miles';

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
    ORDER BY ${orderBy}
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
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

// ── Deals by day ──

export async function getDealsByDay(day: number): Promise<HappyHourDeal[]> {
  const sql = `
    SELECT id, venue_id, day_of_week, start_time::text, end_time::text,
           description, deal_type, is_active, created_at, updated_at
    FROM happy_hour_deals
    WHERE $1 = ANY(day_of_week) AND is_active = true
    ORDER BY start_time
  `;

  const result = await query<HappyHourDeal>(sql, [day]);
  return result.rows;
}
