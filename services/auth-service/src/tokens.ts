import jwt, { type SignOptions } from 'jsonwebtoken';
import { UnauthorizedError, type JwtClaims, type User } from '@ecom/shared';
import { config } from './config.js';

export function signToken(user: User): string {
  const claims: JwtClaims = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(claims, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  } as SignOptions);
}

export function verifyToken(token: string): JwtClaims {
  try {
    // Pinning the algorithm blocks the classic "alg: none" downgrade.
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as JwtClaims;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Your session has expired, please sign in again');
    }
    throw new UnauthorizedError('Invalid authentication token');
  }
}

/** Pulls the raw token out of an `Authorization: Bearer <token>` header. */
export function extractBearerToken(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required');
  }

  const token = header.slice('Bearer '.length).trim();

  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }

  return token;
}
