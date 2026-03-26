import { query, pool } from '../db/connection';
import { hashPassword, comparePassword, generateTokens } from './auth';
import { updateVenue, updateDeal, deleteDeal } from './admin';
import {
  Venue,
  HappyHourDeal,
  AuthTokens,
  VenueOwner,
  VenueOwnerProfile,
  CreateVenueOwnerInput,
  CreateVenueInput,
  UpdateVenueInput,
  CreateDealInput,
  UpdateDealInput,
} from '../types';

// ── Helpers ──

const VENUE_COLUMNS = `
  id, name, address, city, state, zip,
  ST_Y(location::geometry) AS latitude,
  ST_X(location::geometry) AS longitude,
  phone, website, image_url, category,
  created_at, updated_at
`;

export async function verifyVenueOwnership(ownerId: string, venueId: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM venue_ownership WHERE venue_owner_id = $1 AND venue_id = $2',
    [ownerId, venueId]
  );
  return result.rows.length > 0;
}

export async function verifyDealOwnership(ownerId: string, dealId: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM happy_hour_deals d
     JOIN venue_ownership vo ON vo.venue_id = d.venue_id
     WHERE d.id = $1 AND vo.venue_owner_id = $2`,
    [dealId, ownerId]
  );
  return result.rows.length > 0;
}

// ── Owner Auth ──

export async function registerOwner(
  input: CreateVenueOwnerInput
): Promise<{ tokens: AuthTokens; owner: VenueOwnerProfile }> {
  // Check email uniqueness across all user tables
  const emailCheck = await query(
    `SELECT email FROM users WHERE email = $1
     UNION ALL
     SELECT email FROM admin_users WHERE email = $1
     UNION ALL
     SELECT email FROM venue_owners WHERE email = $1`,
    [input.email]
  );

  if (emailCheck.rows.length > 0) {
    throw new Error('Email already in use');
  }

  const passwordHash = await hashPassword(input.password);

  const result = await query<VenueOwner>(
    `INSERT INTO venue_owners (email, password_hash, business_name, contact_name, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.email, passwordHash, input.business_name, input.contact_name, input.phone || null]
  );

  const owner = result.rows[0];

  const tokens = generateTokens({
    sub: owner.id,
    email: owner.email,
    role: 'venue_owner',
  });

  const profile: VenueOwnerProfile = {
    id: owner.id,
    email: owner.email,
    business_name: owner.business_name,
    contact_name: owner.contact_name,
    phone: owner.phone,
    is_verified: owner.is_verified,
    is_suspended: owner.is_suspended,
    created_at: owner.created_at,
    updated_at: owner.updated_at,
  };

  return { tokens, owner: profile };
}

export async function loginOwner(
  email: string,
  password: string
): Promise<{ tokens: AuthTokens; owner: VenueOwnerProfile }> {
  const result = await query<VenueOwner>(
    'SELECT * FROM venue_owners WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const owner = result.rows[0];

  const isMatch = await comparePassword(password, owner.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  if (owner.is_suspended) {
    throw new Error('Account is suspended');
  }

  const tokens = generateTokens({
    sub: owner.id,
    email: owner.email,
    role: 'venue_owner',
  });

  const profile: VenueOwnerProfile = {
    id: owner.id,
    email: owner.email,
    business_name: owner.business_name,
    contact_name: owner.contact_name,
    phone: owner.phone,
    is_verified: owner.is_verified,
    is_suspended: owner.is_suspended,
    created_at: owner.created_at,
    updated_at: owner.updated_at,
  };

  return { tokens, owner: profile };
}

// ── Venue Management ──

export async function getOwnerVenues(ownerId: string): Promise<Venue[]> {
  const result = await query<Venue>(
    `SELECT
       v.id, v.name, v.address, v.city, v.state, v.zip,
       ST_Y(v.location::geometry) AS latitude,
       ST_X(v.location::geometry) AS longitude,
       v.phone, v.website, v.image_url, v.category,
       v.created_at, v.updated_at
     FROM venues v
     JOIN venue_ownership vo ON vo.venue_id = v.id
     WHERE vo.venue_owner_id = $1
     ORDER BY v.created_at DESC`,
    [ownerId]
  );
  return result.rows;
}

export async function createOwnerVenue(ownerId: string, input: CreateVenueInput): Promise<Venue> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const venueResult = await client.query<Venue>(
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

    const venue = venueResult.rows[0];

    await client.query(
      'INSERT INTO venue_ownership (venue_owner_id, venue_id) VALUES ($1, $2)',
      [ownerId, venue.id]
    );

    await client.query('COMMIT');
    return venue;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOwnerVenue(
  ownerId: string,
  venueId: string,
  input: UpdateVenueInput
): Promise<Venue | null> {
  const isOwner = await verifyVenueOwnership(ownerId, venueId);
  if (!isOwner) {
    throw new Error('Venue not found or not owned by this account');
  }

  return updateVenue(venueId, input);
}

// ── Deal Management ──

export async function createOwnerDeal(
  ownerId: string,
  venueId: string,
  input: CreateDealInput
): Promise<HappyHourDeal | null> {
  const isOwner = await verifyVenueOwnership(ownerId, venueId);
  if (!isOwner) {
    throw new Error('Venue not found or not owned by this account');
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

export async function updateOwnerDeal(
  ownerId: string,
  dealId: string,
  input: UpdateDealInput
): Promise<HappyHourDeal | null> {
  const isOwner = await verifyDealOwnership(ownerId, dealId);
  if (!isOwner) {
    throw new Error('Deal not found or not owned by this account');
  }

  return updateDeal(dealId, input);
}

export async function deleteOwnerDeal(ownerId: string, dealId: string): Promise<boolean> {
  const isOwner = await verifyDealOwnership(ownerId, dealId);
  if (!isOwner) {
    throw new Error('Deal not found or not owned by this account');
  }

  return deleteDeal(dealId);
}
