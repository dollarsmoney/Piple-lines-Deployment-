import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, type JwtClaims } from '@ecom/shared';
import { config } from '../config.js';

/**
 * Downstream services trust `x-user-id` completely, so the gateway must be the
 * only thing that can ever set it. This runs before anything else and deletes
 * the header off every inbound request — a client sending
 * `x-user-id: usr_admin` gets it dropped, not forwarded.
 */
export const stripIdentityHeaders: RequestHandler = (req, _res, next) => {
  for (const header of Object.keys(req.headers)) {
    if (header.toLowerCase().startsWith('x-user-')) {
      delete req.headers[header];
    }
  }
  next();
};

function readClaims(authorization: string | undefined): JwtClaims | null {
  if (!authorization?.startsWith('Bearer ')) return null;

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return null;

  try {
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as JwtClaims;
  } catch {
    return null;
  }
}

/**
 * Verifies the bearer token locally (the secret is shared with auth-service)
 * and translates it into the internal identity headers. Verifying here rather
 * than calling auth-service keeps one network hop off every cart request.
 */
export function authenticate(required: boolean): RequestHandler {
  return (req, _res, next) => {
    const claims = readClaims(req.header('authorization'));

    if (!claims) {
      if (required) {
        next(new UnauthorizedError('Sign in to continue'));
        return;
      }
      next();
      return;
    }

    req.headers['x-user-id'] = claims.sub;
    req.headers['x-user-email'] = claims.email;
    req.headers['x-user-role'] = claims.role;
    next();
  };
}
