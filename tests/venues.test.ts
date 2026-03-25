import request from 'supertest';
import app from '../src/app';
import { query } from '../src/db/connection';

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

describe('GET /venues/:id', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should return a venue with its deals (200)', async () => {
    // First query: getVenueById
    mockQuery.mockResolvedValueOnce(makeResult([sampleVenue]));
    // Second query: getDealsByVenue
    mockQuery.mockResolvedValueOnce(makeResult([sampleDeal]));

    const res = await request(app).get('/venues/venue-1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.id).toBe('venue-1');
    expect(res.body.data.name).toBe('The Tap Room');
    expect(Array.isArray(res.body.data.deals)).toBe(true);
    expect(res.body.data.deals).toHaveLength(1);
    expect(res.body.data.deals[0].description).toBe('$3 draft beers');
  });

  it('should return 404 when venue is not found', async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app).get('/venues/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});
