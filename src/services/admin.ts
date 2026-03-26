import { query } from '../db/connection';
import { comparePassword, generateTokens } from './auth';
import {
  Venue,
  HappyHourDeal,
  AuthTokens,
  CreateVenueInput,
  UpdateVenueInput,
  CreateDealInput,
  UpdateDealInput,
  VenueOwnerProfile,
} from '../types';

// ── Admin Auth ──

export async function loginAdmin(email: string, password: string): Promise<AuthTokens | null> {
  const result = await query(
    'SELECT id, email, password_hash, role FROM admin_users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const admin = result.rows[0];
  const isMatch = await comparePassword(password, admin.password_hash);

  if (!isMatch) {
    return null;
  }

  return generateTokens({ sub: admin.id, email: admin.email, role: admin.role });
}

// ── Venues ──

const VENUE_COLUMNS = `
  id, name, address, city, state, zip,
  ST_Y(location::geometry) AS latitude,
  ST_X(location::geometry) AS longitude,
  phone, website, image_url, category,
  created_at, updated_at
`;

export async function createVenue(input: CreateVenueInput): Promise<Venue> {
  const result = await query<Venue>(
    `INSERT INTO venues (name, address, city, state, zip, location, phone, website, image_url, category)
     VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, $8, $9, $10, $11)
     RETURNING ${VENUE_COLUMNS}`,
    [
      input.name,
      input.address,
      input.city,
      input.state,
      input.zip,
      input.longitude,
      input.latitude,
      input.phone || null,
      input.website || null,
      input.image_url || null,
      input.category,
    ]
  );

  return result.rows[0];
}

export async function updateVenue(id: string, input: UpdateVenueInput): Promise<Venue | null> {
  // Build dynamic SET clause from provided fields
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const simpleFields: Array<keyof UpdateVenueInput> = [
    'name', 'address', 'city', 'state', 'zip',
    'phone', 'website', 'image_url', 'category',
  ];

  for (const field of simpleFields) {
    if (input[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(input[field]);
      paramIndex++;
    }
  }

  // Handle location update if lat or lng is provided
  if (input.latitude !== undefined || input.longitude !== undefined) {
    // We need both lat and lng to rebuild the geography point.
    // If only one is provided, we need to fetch the current value for the other.
    let lat = input.latitude;
    let lng = input.longitude;

    if (lat === undefined || lng === undefined) {
      const current = await query(
        'SELECT ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude FROM venues WHERE id = $1',
        [id]
      );
      if (current.rows.length === 0) {
        return null;
      }
      if (lat === undefined) lat = current.rows[0].latitude;
      if (lng === undefined) lng = current.rows[0].longitude;
    }

    setClauses.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography`);
    values.push(lng, lat);
    paramIndex += 2;
  }

  if (setClauses.length === 0) {
    // Nothing to update — just return the current venue
    const current = await query<Venue>(
      `SELECT ${VENUE_COLUMNS} FROM venues WHERE id = $1`,
      [id]
    );
    return current.rows[0] || null;
  }

  setClauses.push(`updated_at = NOW()`);

  values.push(id);
  const result = await query<Venue>(
    `UPDATE venues SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING ${VENUE_COLUMNS}`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteVenue(id: string): Promise<boolean> {
  const result = await query('DELETE FROM venues WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// ── Deals ──

export async function createDeal(venueId: string, input: CreateDealInput): Promise<HappyHourDeal | null> {
  // Verify venue exists
  const venueResult = await query('SELECT id FROM venues WHERE id = $1', [venueId]);
  if (venueResult.rows.length === 0) {
    return null;
  }

  const result = await query<HappyHourDeal>(
    `INSERT INTO happy_hour_deals (venue_id, day_of_week, start_time, end_time, description, deal_type, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      venueId,
      input.day_of_week,
      input.start_time,
      input.end_time,
      input.description,
      input.deal_type,
      input.is_active ?? true,
    ]
  );

  return result.rows[0];
}

export async function updateDeal(id: string, input: UpdateDealInput): Promise<HappyHourDeal | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fields: Array<keyof UpdateDealInput> = [
    'day_of_week', 'start_time', 'end_time', 'description', 'deal_type', 'is_active',
  ];

  for (const field of fields) {
    if (input[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(input[field]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    const current = await query<HappyHourDeal>(
      'SELECT * FROM happy_hour_deals WHERE id = $1',
      [id]
    );
    return current.rows[0] || null;
  }

  setClauses.push(`updated_at = NOW()`);

  values.push(id);
  const result = await query<HappyHourDeal>(
    `UPDATE happy_hour_deals SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteDeal(id: string): Promise<boolean> {
  const result = await query('DELETE FROM happy_hour_deals WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// ── Venue Owners ──

export async function listVenueOwners(status?: string): Promise<VenueOwnerProfile[]> {
  let sql = `
    SELECT id, email, business_name, contact_name, phone,
           is_verified, is_suspended, created_at, updated_at
    FROM venue_owners
  `;
  const params: unknown[] = [];

  if (status === 'verified') {
    sql += ' WHERE is_verified = TRUE AND is_suspended = FALSE';
  } else if (status === 'unverified') {
    sql += ' WHERE is_verified = FALSE';
  } else if (status === 'suspended') {
    sql += ' WHERE is_suspended = TRUE';
  }

  sql += ' ORDER BY created_at DESC';

  const result = await query<VenueOwnerProfile>(sql, params);
  return result.rows;
}

export async function verifyVenueOwner(ownerId: string): Promise<VenueOwnerProfile | null> {
  const result = await query<VenueOwnerProfile>(
    `UPDATE venue_owners
     SET is_verified = TRUE, is_suspended = FALSE, updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, business_name, contact_name, phone,
               is_verified, is_suspended, created_at, updated_at`,
    [ownerId]
  );
  return result.rows[0] || null;
}

export async function suspendVenueOwner(ownerId: string): Promise<VenueOwnerProfile | null> {
  const result = await query<VenueOwnerProfile>(
    `UPDATE venue_owners
     SET is_suspended = TRUE, updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, business_name, contact_name, phone,
               is_verified, is_suspended, created_at, updated_at`,
    [ownerId]
  );
  return result.rows[0] || null;
}
