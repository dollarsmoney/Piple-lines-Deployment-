import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { reset, seedDemoUsers } from '../store/userStore.js';
import { verifyToken } from '../tokens.js';

const { app } = createApp();

beforeEach(async () => {
  reset();
  await seedDemoUsers();
});

describe('POST /auth/register', () => {
  it('creates an account and returns a usable token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'supersecret' });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      role: 'customer',
    });
    expect(verifyToken(res.body.data.token).email).toBe('ada@example.com');
  });

  it('never returns the password hash', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Ada', email: 'ada2@example.com', password: 'supersecret' });

    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('$2a$');
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Impostor', email: 'demo@shop.dev', password: 'supersecret' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects a short password with per-field details', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Ada', email: 'ada3@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('password');
  });

  it('treats emails case-insensitively', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Impostor', email: 'DEMO@SHOP.DEV', password: 'supersecret' });

    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login', () => {
  it('signs in a seeded demo account', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'demo@shop.dev', password: 'demo1234' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('demo@shop.dev');
  });

  it('returns the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: 'demo@shop.dev', password: 'nope-not-it' });

    const unknownEmail = await request(app)
      .post('/auth/login')
      .send({ email: 'ghost@shop.dev', password: 'demo1234' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe('GET /auth/me', () => {
  async function tokenFor(email: string, password: string) {
    const res = await request(app).post('/auth/login').send({ email, password });
    return res.body.data.token as string;
  }

  it('returns the caller identity for a valid bearer token', async () => {
    const token = await tokenFor('demo@shop.dev', 'demo1234');
    const res = await request(app).get('/auth/me').set('authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('demo@shop.dev');
  });

  it('rejects a missing Authorization header', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const token = await tokenFor('demo@shop.dev', 'demo1234');
    const res = await request(app).get('/auth/me').set('authorization', `Bearer ${token}tampered`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a token signed with a different secret', async () => {
    // HS256 token for {"sub":"usr_x"} signed with "wrong-secret".
    const forged =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfeCJ9.' +
      'PZ9tOJ0Q0zVaJ9E9YZq9pQ0d3sJ8H4bK1uE1Q3qXqZk';

    const res = await request(app).get('/auth/me').set('authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('reports the service as healthy', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', service: 'auth-service' });
  });
});
