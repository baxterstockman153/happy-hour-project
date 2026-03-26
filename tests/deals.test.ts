import request from 'supertest';
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

describe('GET /deals/nearby', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should return 400 when lat is missing', async () => {
    const res = await request(app).get('/deals/nearby?lng=-97.74');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/lat and lng/i);
  });

  it('should return 400 when lng is missing', async () => {
    const res = await request(app).get('/deals/nearby?lat=30.27');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/lat and lng/i);
  });

  it('should return 400 when lat/lng are not valid numbers', async () => {
    const res = await request(app).get('/deals/nearby?lat=abc&lng=def');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid numbers/i);
  });

  it('should return deals array with venue info for valid params', async () => {
    // Count query
    mockQuery.mockResolvedValueOnce(makeResult([{ total: '1' }]));
    // Data query
    mockQuery.mockResolvedValueOnce(makeResult([{
      id: 'deal-1',
      venue_id: 'venue-1',
      day_of_week: [1, 2, 3],
      start_time: '16:00',
      end_time: '18:00',
      description: 'Half-price wings',
      deal_type: 'food',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      v_id: 'venue-1',
      v_name: 'Test Bar',
      v_address: '123 Main St',
      v_city: 'Austin',
      v_state: 'TX',
      v_zip: '78701',
      v_latitude: 30.27,
      v_longitude: -97.74,
      v_phone: null,
      v_website: null,
      v_image_url: null,
      v_category: 'bar',
      v_created_at: new Date(),
      v_updated_at: new Date(),
      distance_miles: 0.5,
    }]));

    const res = await request(app).get('/deals/nearby?lat=30.27&lng=-97.74');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toHaveProperty('venue');
    expect(res.body.data[0].venue.name).toBe('Test Bar');
  });

  it('should return empty results when no deals found', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ total: '0' }]));
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app).get('/deals/nearby?lat=30.27&lng=-97.74');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

describe('GET /deals/nearby - visibility filter', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should include venue_ownership visibility filter in queries', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ total: '0' }]));
    mockQuery.mockResolvedValueOnce(makeResult([]));

    await request(app).get('/deals/nearby?lat=30.27&lng=-97.74');

    // Verify the SQL contains the visibility filter
    const countCall = mockQuery.mock.calls[0][0] as string;
    expect(countCall).toContain('venue_ownership');
    expect(countCall).toContain('venue_owners');
    expect(countCall).toContain('is_verified');
  });
});

describe('GET /deals/happening-now', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should return 400 when lat and lng are missing', async () => {
    const res = await request(app).get('/deals/happening-now');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/lat and lng/i);
  });

  it('should return deals for valid request', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{
      id: 'deal-2',
      venue_id: 'venue-2',
      day_of_week: [0, 1, 2, 3, 4, 5, 6],
      start_time: '15:00',
      end_time: '19:00',
      description: '$5 margaritas',
      deal_type: 'drinks',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      v_id: 'venue-2',
      v_name: 'Margarita Palace',
      v_address: '456 Elm St',
      v_city: 'Austin',
      v_state: 'TX',
      v_zip: '78702',
      v_latitude: 30.26,
      v_longitude: -97.73,
      v_phone: '555-0100',
      v_website: 'https://example.com',
      v_image_url: null,
      v_category: 'restaurant',
      v_created_at: new Date(),
      v_updated_at: new Date(),
      distance_miles: 1.2,
    }]));

    const res = await request(app).get('/deals/happening-now?lat=30.27&lng=-97.74');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].description).toBe('$5 margaritas');
  });
});

// ── optionalAuth + is_favorited tests ──

const sampleDealRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'deal-1',
  venue_id: 'venue-1',
  day_of_week: [1, 2, 3],
  start_time: '16:00',
  end_time: '18:00',
  description: 'Half-price wings',
  deal_type: 'food',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  v_id: 'venue-1',
  v_name: 'Test Bar',
  v_address: '123 Main St',
  v_city: 'Austin',
  v_state: 'TX',
  v_zip: '78701',
  v_latitude: 30.27,
  v_longitude: -97.74,
  v_phone: null,
  v_website: null,
  v_image_url: null,
  v_category: 'bar',
  v_created_at: new Date(),
  v_updated_at: new Date(),
  distance_miles: 0.5,
  ...overrides,
});

describe('GET /deals/nearby - optionalAuth personalization', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should not include is_favorited without auth', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ total: '1' }]));
    mockQuery.mockResolvedValueOnce(makeResult([sampleDealRow()]));

    const res = await request(app).get('/deals/nearby?lat=30.27&lng=-97.74');

    expect(res.status).toBe(200);
    expect(res.body.data[0].venue).not.toHaveProperty('is_favorited');
  });

  it('should include is_favorited with valid Bearer token', async () => {
    const tokens = generateTokens({ sub: 'user-1', email: 'user@example.com' });

    mockQuery.mockResolvedValueOnce(makeResult([{ total: '1' }]));
    mockQuery.mockResolvedValueOnce(makeResult([sampleDealRow({ is_favorited: true })]));

    const res = await request(app)
      .get('/deals/nearby?lat=30.27&lng=-97.74')
      .set('Authorization', `Bearer ${tokens.access_token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].venue.is_favorited).toBe(true);
  });

  it('should include is_favorited: false for non-favorited venues', async () => {
    const tokens = generateTokens({ sub: 'user-1', email: 'user@example.com' });

    mockQuery.mockResolvedValueOnce(makeResult([{ total: '1' }]));
    mockQuery.mockResolvedValueOnce(makeResult([sampleDealRow({ is_favorited: false })]));

    const res = await request(app)
      .get('/deals/nearby?lat=30.27&lng=-97.74')
      .set('Authorization', `Bearer ${tokens.access_token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].venue.is_favorited).toBe(false);
  });

  it('should treat invalid token as unauthenticated (no 401)', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ total: '1' }]));
    mockQuery.mockResolvedValueOnce(makeResult([sampleDealRow()]));

    const res = await request(app)
      .get('/deals/nearby?lat=30.27&lng=-97.74')
      .set('Authorization', 'Bearer invalid-token-value');

    expect(res.status).toBe(200);
    expect(res.body.data[0].venue).not.toHaveProperty('is_favorited');
  });

  it('should treat expired token as unauthenticated (no 401)', async () => {
    // Use a garbage token that won't verify
    mockQuery.mockResolvedValueOnce(makeResult([{ total: '1' }]));
    mockQuery.mockResolvedValueOnce(makeResult([sampleDealRow()]));

    const res = await request(app)
      .get('/deals/nearby?lat=30.27&lng=-97.74')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJ0eXBlIjoiYWNjZXNzIiwiZXhwIjoxfQ.invalid');

    expect(res.status).toBe(200);
    expect(res.body.data[0].venue).not.toHaveProperty('is_favorited');
  });

  it('should add user_favorites LEFT JOIN to SQL when authenticated', async () => {
    const tokens = generateTokens({ sub: 'user-1', email: 'user@example.com' });

    mockQuery.mockResolvedValueOnce(makeResult([{ total: '0' }]));
    mockQuery.mockResolvedValueOnce(makeResult([]));

    await request(app)
      .get('/deals/nearby?lat=30.27&lng=-97.74')
      .set('Authorization', `Bearer ${tokens.access_token}`);

    // Data query is the second call
    const dataSql = mockQuery.mock.calls[1][0] as string;
    expect(dataSql).toContain('user_favorites');
    expect(dataSql).toContain('is_favorited');
  });

  it('should not add user_favorites LEFT JOIN when unauthenticated', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ total: '0' }]));
    mockQuery.mockResolvedValueOnce(makeResult([]));

    await request(app).get('/deals/nearby?lat=30.27&lng=-97.74');

    const dataSql = mockQuery.mock.calls[1][0] as string;
    expect(dataSql).not.toContain('user_favorites');
  });
});

describe('GET /deals/happening-now - optionalAuth personalization', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should not include is_favorited without auth', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([sampleDealRow()]));

    const res = await request(app).get('/deals/happening-now?lat=30.27&lng=-97.74');

    expect(res.status).toBe(200);
    expect(res.body.data[0].venue).not.toHaveProperty('is_favorited');
  });

  it('should include is_favorited with valid Bearer token', async () => {
    const tokens = generateTokens({ sub: 'user-1', email: 'user@example.com' });

    mockQuery.mockResolvedValueOnce(makeResult([sampleDealRow({ is_favorited: true })]));

    const res = await request(app)
      .get('/deals/happening-now?lat=30.27&lng=-97.74')
      .set('Authorization', `Bearer ${tokens.access_token}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].venue.is_favorited).toBe(true);
  });

  it('should treat invalid token as unauthenticated (no 401)', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([sampleDealRow()]));

    const res = await request(app)
      .get('/deals/happening-now?lat=30.27&lng=-97.74')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(200);
    expect(res.body.data[0].venue).not.toHaveProperty('is_favorited');
  });
});

describe('optionalAuth middleware', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should not set user when no Authorization header is present', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ total: '0' }]));
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app).get('/deals/nearby?lat=30.27&lng=-97.74');

    expect(res.status).toBe(200);
    // No user_favorites join means no userId was passed
    const dataSql = mockQuery.mock.calls[1][0] as string;
    expect(dataSql).not.toContain('user_favorites');
  });

  it('should set user for valid access token', async () => {
    const tokens = generateTokens({ sub: 'user-1', email: 'user@example.com' });

    mockQuery.mockResolvedValueOnce(makeResult([{ total: '0' }]));
    mockQuery.mockResolvedValueOnce(makeResult([]));

    await request(app)
      .get('/deals/nearby?lat=30.27&lng=-97.74')
      .set('Authorization', `Bearer ${tokens.access_token}`);

    const dataSql = mockQuery.mock.calls[1][0] as string;
    expect(dataSql).toContain('user_favorites');
  });

  it('should not set user for refresh token (only access tokens accepted)', async () => {
    const tokens = generateTokens({ sub: 'user-1', email: 'user@example.com' });

    mockQuery.mockResolvedValueOnce(makeResult([{ total: '0' }]));
    mockQuery.mockResolvedValueOnce(makeResult([]));

    await request(app)
      .get('/deals/nearby?lat=30.27&lng=-97.74')
      .set('Authorization', `Bearer ${tokens.refresh_token}`);

    const dataSql = mockQuery.mock.calls[1][0] as string;
    expect(dataSql).not.toContain('user_favorites');
  });

  it('should not set user for invalid token (no 401)', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ total: '0' }]));
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .get('/deals/nearby?lat=30.27&lng=-97.74')
      .set('Authorization', 'Bearer garbage.token.value');

    expect(res.status).toBe(200);
    const dataSql = mockQuery.mock.calls[1][0] as string;
    expect(dataSql).not.toContain('user_favorites');
  });
});
