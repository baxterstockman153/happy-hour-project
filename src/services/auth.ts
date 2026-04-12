import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JwtPayload, AuthTokens } from '../types';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(payload: { sub: string; email: string; role?: string }): AuthTokens {
  const secret = getJwtSecret();

  const accessPayload: JwtPayload = {
    sub: payload.sub,
    email: payload.email,
    ...(payload.role && { role: payload.role }),
    type: 'access',
  };

  const refreshPayload: JwtPayload = {
    sub: payload.sub,
    email: payload.email,
    ...(payload.role && { role: payload.role }),
    type: 'refresh',
  };

  const access_token = jwt.sign(accessPayload, secret, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refresh_token = jwt.sign(refreshPayload, secret, { expiresIn: REFRESH_TOKEN_EXPIRY });

  return { access_token, refresh_token };
}

export function verifyToken(token: string): JwtPayload {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret) as JwtPayload;
  return decoded;
}

export function refreshTokens(refreshToken: string): AuthTokens {
  const payload = verifyToken(refreshToken);

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token');
  }

  return generateTokens({
    sub: payload.sub,
    email: payload.email,
    ...(payload.role && { role: payload.role }),
  });
}
