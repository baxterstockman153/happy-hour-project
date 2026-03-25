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
