import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
import { query } from '../src/db/connection';
import { generateTokens } from '../src/services/auth';

process.env.JWT_SECRET = 'test-jwt-secret-for-happy-hour';

jest.mock('../src/db/connection', () => require('./mocks/db'));
const mockQuery = query as jest.MockedFunction<typeof query>;

const makeResult = (rows: any[], rowCount?: number) => ({
  rows,
  rowCount: rowCount ?? rows.length,
  command: '' as const,
  oid: 0,
  fields: [] as any[],
});

// Admin token for authenticated admin requests
const adminTokens = generateTokens({
  sub: 'admin-1',
  email: 'admin@example.com',
  role: 'super_admin',
});
const adminAuthHeader = `Bearer ${adminTokens.access_token}`;

// Sample data
const sampleVenue = {
  id: 'venue-1',
  name: 'The Tap Room',
  address: '123 Main St',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  latitude: 30.27,
  longitude: -97.74,
  phone: '555-0123',
  website: 'https://taproom.example.com',
  image_url: null,
  category: 'bar',
  created_at: new Date(),
  updated_at: new Date(),
};

const sampleDeal = {
  id: 'deal-1',
  venue_id: 'venue-1',
  day_of_week: [1, 2, 3, 4, 5],
  start_time: '16:00',
  end_time: '19:00',
  description: '$3 draft beers',
  deal_type: 'drinks',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

const validVenueInput = {
  name: 'New Bar',
  address: '456 Oak Ave',
  city: 'Austin',
  state: 'TX',
  zip: '78702',
  latitude: 30.26,
  longitude: -97.73,
  category: 'bar',
};

const validDealInput = {
  day_of_week: [1, 2, 3, 4, 5],
  start_time: '16:00',
  end_time: '19:00',
  description: 'Half-price appetizers',
  deal_type: 'food',
};

/**
 * Helper: set up the mock for adminAuth middleware.
 * The adminAuth middleware queries the admin_users table to verify the admin
 * still exists. This helper configures that mock.
 */
function mockAdminAuthCheck(): void {
  mockQuery.mockResolvedValueOnce(
    makeResult([{ id: 'admin-1', email: 'admin@example.com', role: 'super_admin' }])
  );
}

// ── Admin Login ──────────────────────────────────────────────────────

describe('POST /admin/login', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should login successfully and return tokens with role', async () => {
    const password = 'adminpass123';
    const hash = await bcrypt.hash(password, 10);

    mockQuery.mockResolvedValueOnce(
      makeResult([{ id: 'admin-1', email: 'admin@example.com', password_hash: hash, role: 'super_admin' }])
    );

    const res = await request(app)
      .post('/admin/login')
      .send({ email: 'admin@example.com', password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
  });

  it('should return 401 for invalid credentials', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .post('/admin/login')
      .send({ email: 'bad@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });
});

// ── Create Venue ─────────────────────────────────────────────────────

describe('POST /admin/venues', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should create a venue and return 201', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([sampleVenue]));

    const res = await request(app)
      .post('/admin/venues')
      .set('Authorization', adminAuthHeader)
      .send(validVenueInput);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('The Tap Room');
  });

  it('should return 400 when required fields are missing', async () => {
    mockAdminAuthCheck();

    const res = await request(app)
      .post('/admin/venues')
      .set('Authorization', adminAuthHeader)
      .send({ name: 'Incomplete Venue' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('should return 400 for invalid category', async () => {
    mockAdminAuthCheck();

    const res = await request(app)
      .post('/admin/venues')
      .set('Authorization', adminAuthHeader)
      .send({ ...validVenueInput, category: 'nightclub' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/category must be one of/i);
  });

  it('should return 401 without admin auth', async () => {
    const res = await request(app)
      .post('/admin/venues')
      .send(validVenueInput);

    expect(res.status).toBe(401);
  });
});

// ── Update Venue ─────────────────────────────────────────────────────

describe('PUT /admin/venues/:id', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should update a venue and return 200', async () => {
    mockAdminAuthCheck();
    // updateVenue query: UPDATE RETURNING
    mockQuery.mockResolvedValueOnce(
      makeResult([{ ...sampleVenue, name: 'Updated Tap Room' }])
    );

    const res = await request(app)
      .put('/admin/venues/venue-1')
      .set('Authorization', adminAuthHeader)
      .send({ name: 'Updated Tap Room' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Tap Room');
  });

  it('should return 404 when venue does not exist', async () => {
    mockAdminAuthCheck();
    // updateVenue query returns no rows
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .put('/admin/venues/nonexistent')
      .set('Authorization', adminAuthHeader)
      .send({ name: 'Ghost Venue' });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

// ── Delete Venue ─────────────────────────────────────────────────────

describe('DELETE /admin/venues/:id', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should delete a venue and return 204', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([], 1));

    const res = await request(app)
      .delete('/admin/venues/venue-1')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(204);
  });

  it('should return 404 when venue does not exist', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([], 0));

    const res = await request(app)
      .delete('/admin/venues/nonexistent')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

// ── Create Deal ──────────────────────────────────────────────────────

describe('POST /admin/venues/:id/deals', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should create a deal and return 201', async () => {
    mockAdminAuthCheck();
    // Venue exists check
    mockQuery.mockResolvedValueOnce(makeResult([{ id: 'venue-1' }]));
    // INSERT returning deal
    mockQuery.mockResolvedValueOnce(makeResult([sampleDeal]));

    const res = await request(app)
      .post('/admin/venues/venue-1/deals')
      .set('Authorization', adminAuthHeader)
      .send(validDealInput);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.description).toBe('$3 draft beers');
  });

  it('should return 400 for invalid day_of_week', async () => {
    mockAdminAuthCheck();

    const res = await request(app)
      .post('/admin/venues/venue-1/deals')
      .set('Authorization', adminAuthHeader)
      .send({ ...validDealInput, day_of_week: [7, 8] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/day_of_week/i);
  });

  it('should return 400 for invalid time format', async () => {
    mockAdminAuthCheck();

    const res = await request(app)
      .post('/admin/venues/venue-1/deals')
      .set('Authorization', adminAuthHeader)
      .send({ ...validDealInput, start_time: '4pm' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/start_time/i);
  });

  it('should return 404 when venue does not exist', async () => {
    mockAdminAuthCheck();
    // Venue check returns empty
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .post('/admin/venues/nonexistent/deals')
      .set('Authorization', adminAuthHeader)
      .send(validDealInput);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

// ── Update Deal ──────────────────────────────────────────────────────

describe('PUT /admin/deals/:id', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should update a deal and return 200', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(
      makeResult([{ ...sampleDeal, description: 'Updated deal' }])
    );

    const res = await request(app)
      .put('/admin/deals/deal-1')
      .set('Authorization', adminAuthHeader)
      .send({ description: 'Updated deal' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Updated deal');
  });

  it('should return 404 when deal does not exist', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .put('/admin/deals/nonexistent')
      .set('Authorization', adminAuthHeader)
      .send({ description: 'No such deal' });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});

// ── Delete Deal ──────────────────────────────────────────────────────

describe('DELETE /admin/deals/:id', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should delete a deal and return 204', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([], 1));

    const res = await request(app)
      .delete('/admin/deals/deal-1')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(204);
  });

  it('should return 404 when deal does not exist', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([], 0));

    const res = await request(app)
      .delete('/admin/deals/nonexistent')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});
