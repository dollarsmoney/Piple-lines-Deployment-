import { readPort } from '@ecom/service-kit';

const FALLBACK_SECRET = 'dev-only-secret-change-me';

export const config = {
  service: 'auth-service',
  port: readPort('PORT', 4001),
  jwtSecret: process.env.JWT_SECRET ?? FALLBACK_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  /** bcrypt rounds — low in tests so the suite stays fast. */
  bcryptRounds: process.env.NODE_ENV === 'test' ? 4 : 10,
};

if (config.jwtSecret === FALLBACK_SECRET && process.env.NODE_ENV === 'production') {
  // Loud rather than fatal: this is a demo app, but the operator should know.
  console.warn(
    '[auth-service] JWT_SECRET is unset and falling back to the public demo secret. ' +
      'Set JWT_SECRET before exposing this anywhere real.'
  );
}
