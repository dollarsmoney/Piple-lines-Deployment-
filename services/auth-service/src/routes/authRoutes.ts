import { asyncHandler, router, validate } from '@ecom/service-kit';
import {
  UnauthorizedError,
  loginSchema,
  ok,
  registerSchema,
  type AuthPayload,
  type LoginInput,
  type RegisterInput,
} from '@ecom/shared';
import { extractBearerToken, signToken, verifyToken } from '../tokens.js';
import { createUser, findByEmail, findById, toPublicUser, verifyPassword } from '../store/userStore.js';

export const authRoutes = router();

authRoutes.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as RegisterInput;
    const user = await createUser(input);

    res.status(201).json(ok<AuthPayload>({ token: signToken(user), user }));
  })
);

authRoutes.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as LoginInput;
    const record = findByEmail(email);

    // Same message either way — telling a caller *which* half was wrong hands
    // them a way to enumerate registered emails.
    const invalid = new UnauthorizedError('Incorrect email or password');

    if (!record) throw invalid;
    if (!(await verifyPassword(record, password))) throw invalid;

    const user = toPublicUser(record);
    res.json(ok<AuthPayload>({ token: signToken(user), user }));
  })
);

authRoutes.get(
  '/me',
  asyncHandler(async (req, res) => {
    const claims = verifyToken(extractBearerToken(req.header('authorization')));
    const record = findById(claims.sub);

    if (!record) {
      throw new UnauthorizedError('This account no longer exists');
    }

    res.json(ok(toPublicUser(record)));
  })
);

/**
 * Internal-only: lets the gateway confirm a token without duplicating the
 * secret-handling logic. Not routed through the public gateway prefix.
 */
authRoutes.get(
  '/verify',
  asyncHandler(async (req, res) => {
    const claims = verifyToken(extractBearerToken(req.header('authorization')));

    res.json(ok(claims));
  })
);
