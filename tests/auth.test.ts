import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
import { query } from '../src/db/connection';
import { generateTokens } from '../src/services/auth';

// Set JWT_SECRET before any auth code runs
process.env.JWT_SECRET = 'test-jwt-secret-for-happy-hour';

jest.mock('../src/db/connection', () => require('./mocks/db'));
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('POST /auth/register', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should register a new user and return tokens (201)', async () => {
    // First query: check existing user → none found
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: '',
      oid: 0,
      fields: [],
    });
    // Second query: INSERT returning new user
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-1', email: 'new@example.com' }],
      rowCount: 1,
      command: '',
      oid: 0,
      fields: [],
    });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'securepass123', display_name: 'Test' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
  });

  it('should return 409 when email already exists', async () => {
    // Existing user found
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-existing' }],
      rowCount: 1,
      command: '',
      oid: 0,
      fields: [],
    });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'existing@example.com', password: 'securepass123' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('should return 400 when password is too short', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 8 characters/i);
  });
});

describe('POST /auth/login', () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it('should login successfully and return tokens (200)', async () => {
    const password = 'securepass123';
    const hash = await bcrypt.hash(password, 10);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-1', email: 'user@example.com', password_hash: hash }],
      rowCount: 1,
      command: '',
      oid: 0,
      fields: [],
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
  });

  it('should return 401 for wrong password', async () => {
    const hash = await bcrypt.hash('correctpassword', 10);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-1', email: 'user@example.com', password_hash: hash }],
      rowCount: 1,
      command: '',
      oid: 0,
      fields: [],
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('should return 401 for non-existent email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: '',
      oid: 0,
      fields: [],
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'somepassword1' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });
});

describe('POST /auth/refresh', () => {
  it('should return new tokens with a valid refresh token', async () => {
    const tokens = generateTokens({ sub: 'user-1', email: 'user@example.com' });

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: tokens.refresh_token });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
  });

  it('should return 401 with an invalid refresh token', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: 'invalid-token-value' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it('should return 400 when refresh_token is missing', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('should return 401 when an access token is used as refresh token', async () => {
    const tokens = generateTokens({ sub: 'user-1', email: 'user@example.com' });

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refresh_token: tokens.access_token });

    expect(res.status).toBe(401);
  });
});
