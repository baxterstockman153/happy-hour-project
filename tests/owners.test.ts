import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
import { query } from '../src/db/connection';
import { generateTokens } from '../src/services/auth';

process.env.JWT_SECRET = 'test-jwt-secret-for-happy-hour';

jest.mock('../src/db/connection', () => require('./mocks/db'));
const mockQuery = query as jest.MockedFunction<typeof query>;

// Mock pool.connect for transaction support
import { pool } from '../src/db/connection';
const mockPool = pool as any;

const makeResult = (rows: any[], rowCount?: number) => ({
  rows,
  rowCount: rowCount ?? rows.length,
  command: '' as const,
  oid: 0,
  fields: [] as any[],
});

// Owner token for authenticated owner requests
const ownerTokens = generateTokens({
  sub: 'owner-1',
  email: 'owner@example.com',
  role: 'venue_owner',
});
const ownerAuthHeader = `Bearer ${ownerTokens.access_token}`;

// Admin token for admin routes
const adminTokens = generateTokens({
  sub: 'admin-1',
  email: 'admin@example.com',
  role: 'super_admin',
});
const adminAuthHeader = `Bearer ${adminTokens.access_token}`;

// Sample data
const sampleOwner = {
  id: 'owner-1',
  email: 'owner@example.com',
  password_hash: '$2b$10$hash',
  business_name: 'Test Business',
  contact_name: 'John Owner',
  phone: '555-0100',
  is_verified: false,
  is_suspended: false,
  created_at: new Date(),
  updated_at: new Date(),
};

const sampleVenue = {
  id: 'venue-1',
  name: 'Owner Bar',
  address: '123 Main St',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  latitude: 30.27,
  longitude: -97.74,
  phone: '555-0123',
  website: null,
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
 * Helper: mock the ownerAuth middleware DB check.
 * ownerAuth queries venue_owners to verify the owner exists and is not suspended.
 */
function mockOwnerAuthCheck(): void {
  mockQuery.mockResolvedValueOnce(
    makeResult([{ id: 'owner-1', email: 'owner@example.com' }])
  );
}

/**
 * Helper: mock ownerAuth + requireVenueOwnership checks.
 */
function mockOwnerAuthAndOwnership(): void {
  mockOwnerAuthCheck();
  // requireVenueOwnership query
  mockQuery.mockResolvedValueOnce(makeResult([{ '?column?': 1 }]));
}

/**
 * Helper: mock adminAuth check.
 */
function mockAdminAuthCheck(): void {
  mockQuery.mockResolvedValueOnce(
    makeResult([{ id: 'admin-1', email: 'admin@example.com', role: 'super_admin' }])
  );
}

// ── Owner Registration ──────────────────────────────────────────────

describe('POST /owners/register', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should register successfully and return 201 with tokens and owner', async () => {
    // Email uniqueness check (UNION ALL query returns empty)
    mockQuery.mockResolvedValueOnce(makeResult([]));
    // INSERT returning owner
    mockQuery.mockResolvedValueOnce(makeResult([sampleOwner]));

    const res = await request(app)
      .post('/owners/register')
      .send({
        email: 'newowner@example.com',
        password: 'password123',
        business_name: 'Test Business',
        contact_name: 'John Owner',
        phone: '555-0100',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('tokens');
    expect(res.body.tokens).toHaveProperty('access_token');
    expect(res.body.tokens).toHaveProperty('refresh_token');
    expect(res.body).toHaveProperty('owner');
    expect(res.body.owner.email).toBe('owner@example.com');
    expect(res.body.owner).not.toHaveProperty('password_hash');
  });

  it('should return 409 for duplicate email', async () => {
    // Email uniqueness check returns existing email
    mockQuery.mockResolvedValueOnce(makeResult([{ email: 'existing@example.com' }]));

    const res = await request(app)
      .post('/owners/register')
      .send({
        email: 'existing@example.com',
        password: 'password123',
        business_name: 'Test Business',
        contact_name: 'John Owner',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already in use/i);
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/owners/register')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('should return 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/owners/register')
      .send({
        email: 'not-an-email',
        password: 'password123',
        business_name: 'Test',
        contact_name: 'John',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('should return 400 for password too short', async () => {
    const res = await request(app)
      .post('/owners/register')
      .send({
        email: 'test@example.com',
        password: 'short',
        business_name: 'Test',
        contact_name: 'John',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/i);
  });
});

// ── Owner Login ─────────────────────────────────────────────────────

describe('POST /owners/login', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should login successfully and return tokens', async () => {
    const password = 'ownerpass123';
    const hash = await bcrypt.hash(password, 10);

    mockQuery.mockResolvedValueOnce(
      makeResult([{ ...sampleOwner, password_hash: hash }])
    );

    const res = await request(app)
      .post('/owners/login')
      .send({ email: 'owner@example.com', password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tokens');
    expect(res.body.tokens).toHaveProperty('access_token');
    expect(res.body.tokens).toHaveProperty('refresh_token');
  });

  it('should return 401 for invalid credentials', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .post('/owners/login')
      .send({ email: 'bad@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('should return 403 for suspended account', async () => {
    const password = 'ownerpass123';
    const hash = await bcrypt.hash(password, 10);

    mockQuery.mockResolvedValueOnce(
      makeResult([{ ...sampleOwner, password_hash: hash, is_suspended: true }])
    );

    const res = await request(app)
      .post('/owners/login')
      .send({ email: 'owner@example.com', password });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });
});

// ── List Owner Venues ───────────────────────────────────────────────

describe('GET /owners/me/venues', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should return owner venues', async () => {
    mockOwnerAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([sampleVenue]));

    const res = await request(app)
      .get('/owners/me/venues')
      .set('Authorization', ownerAuthHeader);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Owner Bar');
  });

  it('should return 401 without auth', async () => {
    const res = await request(app).get('/owners/me/venues');
    expect(res.status).toBe(401);
  });
});

// ── Create Owner Venue ──────────────────────────────────────────────

describe('POST /owners/me/venues', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should create a venue and return 201', async () => {
    mockOwnerAuthCheck();

    // Mock pool.connect for transaction
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(makeResult([])) // BEGIN
        .mockResolvedValueOnce(makeResult([sampleVenue])) // INSERT venue
        .mockResolvedValueOnce(makeResult([])) // INSERT ownership
        .mockResolvedValueOnce(makeResult([])), // COMMIT
      release: jest.fn(),
    };
    mockPool.connect = jest.fn().mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .post('/owners/me/venues')
      .set('Authorization', ownerAuthHeader)
      .send(validVenueInput);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should return 400 when required fields are missing', async () => {
    mockOwnerAuthCheck();

    const res = await request(app)
      .post('/owners/me/venues')
      .set('Authorization', ownerAuthHeader)
      .send({ name: 'Incomplete Venue' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });
});

// ── Update Owner Venue ──────────────────────────────────────────────

describe('PUT /owners/me/venues/:id', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should update a venue and return 200', async () => {
    mockOwnerAuthAndOwnership();
    // verifyVenueOwnership in service
    mockQuery.mockResolvedValueOnce(makeResult([{ '?column?': 1 }]));
    // updateVenue query
    mockQuery.mockResolvedValueOnce(
      makeResult([{ ...sampleVenue, name: 'Updated Bar' }])
    );

    const res = await request(app)
      .put('/owners/me/venues/venue-1')
      .set('Authorization', ownerAuthHeader)
      .send({ name: 'Updated Bar' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Bar');
  });

  it('should return 403 when not owner (middleware check)', async () => {
    mockOwnerAuthCheck();
    // requireVenueOwnership returns empty
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .put('/owners/me/venues/venue-999')
      .set('Authorization', ownerAuthHeader)
      .send({ name: 'Not My Venue' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/do not own/i);
  });
});

// ── Create Owner Deal ───────────────────────────────────────────────

describe('POST /owners/me/venues/:id/deals', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should create a deal and return 201', async () => {
    mockOwnerAuthAndOwnership();
    // verifyVenueOwnership in service
    mockQuery.mockResolvedValueOnce(makeResult([{ '?column?': 1 }]));
    // INSERT deal
    mockQuery.mockResolvedValueOnce(makeResult([sampleDeal]));

    const res = await request(app)
      .post('/owners/me/venues/venue-1/deals')
      .set('Authorization', ownerAuthHeader)
      .send(validDealInput);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('should return 400 for invalid deal input', async () => {
    mockOwnerAuthAndOwnership();

    const res = await request(app)
      .post('/owners/me/venues/venue-1/deals')
      .set('Authorization', ownerAuthHeader)
      .send({ ...validDealInput, day_of_week: [7, 8] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/day_of_week/i);
  });
});

// ── Update Owner Deal ───────────────────────────────────────────────

describe('PUT /owners/me/deals/:id', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should update a deal and return 200', async () => {
    mockOwnerAuthCheck();
    // verifyDealOwnership
    mockQuery.mockResolvedValueOnce(makeResult([{ '?column?': 1 }]));
    // updateDeal query
    mockQuery.mockResolvedValueOnce(
      makeResult([{ ...sampleDeal, description: 'Updated deal' }])
    );

    const res = await request(app)
      .put('/owners/me/deals/deal-1')
      .set('Authorization', ownerAuthHeader)
      .send({ description: 'Updated deal' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Updated deal');
  });

  it('should return 500 when deal not owned (ownership check fails)', async () => {
    mockOwnerAuthCheck();
    // verifyDealOwnership returns empty
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .put('/owners/me/deals/deal-999')
      .set('Authorization', ownerAuthHeader)
      .send({ description: 'Not my deal' });

    expect(res.status).toBe(500);
  });
});

// ── Delete Owner Deal ───────────────────────────────────────────────

describe('DELETE /owners/me/deals/:id', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should delete a deal and return 204', async () => {
    mockOwnerAuthCheck();
    // verifyDealOwnership
    mockQuery.mockResolvedValueOnce(makeResult([{ '?column?': 1 }]));
    // deleteDeal
    mockQuery.mockResolvedValueOnce(makeResult([], 1));

    const res = await request(app)
      .delete('/owners/me/deals/deal-1')
      .set('Authorization', ownerAuthHeader);

    expect(res.status).toBe(204);
  });

  it('should return 500 when deal not owned', async () => {
    mockOwnerAuthCheck();
    // verifyDealOwnership returns empty
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .delete('/owners/me/deals/deal-999')
      .set('Authorization', ownerAuthHeader);

    expect(res.status).toBe(500);
  });
});

// ── Admin Owner Management ──────────────────────────────────────────

describe('GET /admin/owners', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should list all owners', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([
      {
        id: 'owner-1',
        email: 'owner@example.com',
        business_name: 'Test Business',
        contact_name: 'John Owner',
        phone: '555-0100',
        is_verified: false,
        is_suspended: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]));

    const res = await request(app)
      .get('/admin/owners')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).not.toHaveProperty('password_hash');
  });
});

describe('PUT /admin/owners/:id/verify', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should verify an owner', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([{
      ...sampleOwner,
      is_verified: true,
      is_suspended: false,
    }]));

    const res = await request(app)
      .put('/admin/owners/owner-1/verify')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(200);
    expect(res.body.is_verified).toBe(true);
  });

  it('should return 404 when owner not found', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .put('/admin/owners/nonexistent/verify')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(404);
  });
});

describe('PUT /admin/owners/:id/suspend', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should suspend an owner', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([{
      ...sampleOwner,
      is_verified: true,
      is_suspended: true,
    }]));

    const res = await request(app)
      .put('/admin/owners/owner-1/suspend')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(200);
    expect(res.body.is_suspended).toBe(true);
  });

  it('should return 404 when owner not found', async () => {
    mockAdminAuthCheck();
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .put('/admin/owners/nonexistent/suspend')
      .set('Authorization', adminAuthHeader);

    expect(res.status).toBe(404);
  });
});
