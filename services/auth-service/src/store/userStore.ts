import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ConflictError, type Role, type User, type UserRecord } from '@ecom/shared';
import { config } from '../config.js';

/**
 * In-memory user table keyed by lowercase email. Everything behind this small
 * interface, so swapping in a real database later means changing only this file.
 */
const users = new Map<string, UserRecord>();

export interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export const DEMO_USERS: SeedUser[] = [
  { name: 'Demo Shopper', email: 'demo@shop.dev', password: 'demo1234', role: 'customer' },
  { name: 'Store Admin', email: 'admin@shop.dev', password: 'admin1234', role: 'admin' },
];

export function toPublicUser(record: UserRecord): User {
  const { passwordHash: _passwordHash, ...user } = record;
  return user;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role?: Role;
}): Promise<User> {
  const email = input.email.toLowerCase();

  if (users.has(email)) {
    throw new ConflictError('An account with that email already exists');
  }

  const record: UserRecord = {
    id: `usr_${randomUUID()}`,
    email,
    name: input.name,
    role: input.role ?? 'customer',
    createdAt: new Date().toISOString(),
    passwordHash: await bcrypt.hash(input.password, config.bcryptRounds),
  };

  users.set(email, record);
  return toPublicUser(record);
}

export function findByEmail(email: string): UserRecord | undefined {
  return users.get(email.toLowerCase());
}

export function findById(id: string): UserRecord | undefined {
  for (const record of users.values()) {
    if (record.id === id) return record;
  }
  return undefined;
}

export async function verifyPassword(record: UserRecord, password: string): Promise<boolean> {
  return bcrypt.compare(password, record.passwordHash);
}

export function count(): number {
  return users.size;
}

export function reset(): void {
  users.clear();
}

/** Idempotent so tests can call it after reset() without duplicating rows. */
export async function seedDemoUsers(): Promise<void> {
  for (const seed of DEMO_USERS) {
    if (!users.has(seed.email)) {
      await createUser(seed);
    }
  }
}
