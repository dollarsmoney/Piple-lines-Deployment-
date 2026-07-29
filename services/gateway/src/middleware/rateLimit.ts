import rateLimit from 'express-rate-limit';
import { fail } from '@ecom/shared';
import { config } from '../config.js';

const shared = {
  windowMs: config.rateLimit.windowMs,
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  message: fail('RATE_LIMITED', 'Too many requests — slow down and try again shortly'),
};

export const globalLimiter = rateLimit({
  ...shared,
  max: config.rateLimit.max,
});

/**
 * Login and register are the only endpoints worth brute-forcing, so they get
 * their own much smaller budget on top of the global one.
 */
export const authLimiter = rateLimit({
  ...shared,
  max: config.rateLimit.authMax,
  // Only failed attempts count — a legitimate user signing in repeatedly
  // across devices shouldn't get locked out.
  skipSuccessfulRequests: true,
});
