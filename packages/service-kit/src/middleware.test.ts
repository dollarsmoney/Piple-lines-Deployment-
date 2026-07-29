import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '@ecom/shared';
import { createLogger } from './logger.js';
import { asyncHandler, errorHandler, notFoundHandler, requireUser, validate } from './middleware.js';

const logger = createLogger('test');
logger.level = 'silent';

function buildApp(configure: (app: express.Express) => void) {
  const app = express();
  app.use(express.json());
  configure(app);
  app.use(notFoundHandler());
  app.use(errorHandler(logger));
  return app;
}

describe('validate', () => {
  const schema = z.object({ name: z.string().trim().min(2), age: z.coerce.number().int() });

  it('replaces the body with the parsed, coerced value', async () => {
    const app = buildApp((a) => {
      a.post('/echo', validate(schema), (req, res) => {
        res.json(req.body);
      });
    });

    const res = await request(app).post('/echo').send({ name: '  Ada  ', age: '36' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'Ada', age: 36 });
  });

  it('returns 400 with per-field details when validation fails', async () => {
    const app = buildApp((a) => {
      a.post('/echo', validate(schema), (_req, res) => res.json({ ok: true }));
    });

    const res = await request(app).post('/echo').send({ name: 'A', age: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(['name', 'age']);
  });

  it('validates the query string too', async () => {
    const app = buildApp((a) => {
      a.get('/search', validate(z.object({ page: z.coerce.number().default(1) }), 'query'), (req, res) =>
        res.json(req.query)
      );
    });

    const res = await request(app).get('/search?page=4');

    expect(res.body).toEqual({ page: 4 });
  });
});

describe('requireUser', () => {
  const app = buildApp((a) => {
    a.get('/me', requireUser, (req, res) => res.json({ userId: req.userId }));
  });

  it('rejects a request with no x-user-id header', async () => {
    const res = await request(app).get('/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('exposes the header as req.userId', async () => {
    const res = await request(app).get('/me').set('x-user-id', 'u-1');

    expect(res.body).toEqual({ userId: 'u-1' });
  });
});

describe('errorHandler', () => {
  it('maps an AppError subclass to its status and code', async () => {
    const app = buildApp((a) => {
      a.get('/missing', () => {
        throw new NotFoundError('Product');
      });
    });

    const res = await request(app).get('/missing');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Product not found' });
  });

  it('hides the internal message behind a generic 500', async () => {
    const app = buildApp((a) => {
      a.get('/boom', () => {
        throw new Error('connection string leaked here');
      });
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('Something went wrong on our end');
    expect(JSON.stringify(res.body)).not.toContain('connection string');
  });

  it('catches rejected promises via asyncHandler', async () => {
    const app = buildApp((a) => {
      a.get(
        '/async-boom',
        asyncHandler(async () => {
          throw new ValidationError('bad input');
        })
      );
    });

    const res = await request(app).get('/async-boom');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('bad input');
  });
});

describe('notFoundHandler', () => {
  it('returns a 404 envelope for an unknown route', async () => {
    const res = await request(buildApp(() => {})).get('/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
