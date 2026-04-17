import { query } from '../db/connection';
import { Reservation, CreateReservationInput } from '../types';

export async function createReservation(
  input: CreateReservationInput,
  userId?: string
): Promise<Reservation> {
  const {
    venue_id,
    deal_id,
    name,
    email,
    phone,
    party_size,
    reservation_date,
    reservation_time,
    special_requests,
  } = input;

  const sql = `
    INSERT INTO reservations (
      venue_id, deal_id, user_id, name, email, phone,
      party_size, reservation_date, reservation_time, special_requests
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, venue_id, deal_id, user_id, name, email, phone,
              party_size, reservation_date::text, reservation_time::text,
              special_requests, status, created_at, updated_at
  `;

  const result = await query<Reservation>(sql, [
    venue_id,
    deal_id ?? null,
    userId ?? null,
    name,
    email,
    phone ?? null,
    party_size,
    reservation_date,
    reservation_time,
    special_requests ?? null,
  ]);

  return result.rows[0];
}

export async function getUserReservations(userId: string): Promise<(Reservation & { venue_name: string; venue_address: string })[]> {
  const sql = `
    SELECT r.id, r.venue_id, r.deal_id, r.user_id, r.name, r.email, r.phone,
           r.party_size, r.reservation_date::text, r.reservation_time::text,
           r.special_requests, r.status, r.created_at, r.updated_at,
           v.name AS venue_name, v.address AS venue_address
    FROM reservations r
    JOIN venues v ON v.id = r.venue_id
    WHERE r.user_id = $1
    ORDER BY r.reservation_date DESC, r.reservation_time DESC
  `;

  const result = await query<Reservation & { venue_name: string; venue_address: string }>(sql, [userId]);
  return result.rows;
}

export async function cancelReservation(id: string, userId?: string): Promise<Reservation | null> {
  const conditions = userId
    ? `id = $1 AND (user_id = $2 OR user_id IS NULL) AND status = 'confirmed'`
    : `id = $1 AND status = 'confirmed'`;
  const params: unknown[] = userId ? [id, userId] : [id];

  const sql = `
    UPDATE reservations
    SET status = 'cancelled', updated_at = NOW()
    WHERE ${conditions}
    RETURNING id, venue_id, deal_id, user_id, name, email, phone,
              party_size, reservation_date::text, reservation_time::text,
              special_requests, status, created_at, updated_at
  `;

  const result = await query<Reservation>(sql, params);
  return result.rows[0] ?? null;
}
