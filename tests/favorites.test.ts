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

// Generate a valid user access token for authenticated requests
const userTokens = generateTokens({ sub: 'user-1', email: 'user@example.com' });
const authHeader = `Bearer ${userTokens.access_token}`;

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
  website: null,
  image_url: null,
  category: 'bar',
  created_at: new Date(),
  updated_at: new Date(),
};

describe('GET /users/me/favorites', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should return 401 without an auth token', async () => {
    const res = await request(app).get('/users/me/favorites');
    expect(res.status).toBe(401);
  });

  it('should return the user favorites list with a valid token', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([sampleVenue]));

    const res = await request(app)
      .get('/users/me/favorites')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('The Tap Room');
  });

  it('should return an empty list when user has no favorites', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .get('/users/me/favorites')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('POST /users/me/favorites/:venueId', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should add a favorite and return 201', async () => {
    // First query: getVenueById check
    mockQuery.mockResolvedValueOnce(makeResult([sampleVenue]));
    // Second query: addFavorite INSERT
    mockQuery.mockResolvedValueOnce(makeResult([], 1));

    const res = await request(app)
      .post('/users/me/favorites/venue-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/favorite added/i);
  });

  it('should return 404 when venue does not exist', async () => {
    // getVenueById returns empty
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .post('/users/me/favorites/nonexistent-venue')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('should return 401 without an auth token', async () => {
    const res = await request(app).post('/users/me/favorites/venue-1');
    expect(res.status).toBe(401);
  });
});

describe('DELETE /users/me/favorites/:venueId', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should remove a favorite and return 204', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([], 1));

    const res = await request(app)
      .delete('/users/me/favorites/venue-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
  });

  it('should return 401 without an auth token', async () => {
    const res = await request(app).delete('/users/me/favorites/venue-1');
    expect(res.status).toBe(401);
  });
});
