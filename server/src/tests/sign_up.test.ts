
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput } from '../schema';
import { signUp } from '../handlers/sign_up';
import { eq } from 'drizzle-orm';

const testInput: SignUpInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

describe('signUp', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user', async () => {
    const result = await signUp(testInput);

    // Validate user fields
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.name).toEqual('Test User');
    expect(result.user.password_hash).toEqual('hashed_password123');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Validate token
    expect(result.token).toBeDefined();
    expect(result.token).toMatch(/^token_\d+_\d+$/);
  });

  it('should save user to database', async () => {
    const result = await signUp(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].password_hash).toEqual('hashed_password123');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await signUp(testInput);

    // Try to create second user with same email
    await expect(signUp(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle different user data correctly', async () => {
    const differentInput: SignUpInput = {
      email: 'another@test.com',
      password: 'differentpass',
      name: 'Another User'
    };

    const result = await signUp(differentInput);

    expect(result.user.email).toEqual('another@test.com');
    expect(result.user.name).toEqual('Another User');
    expect(result.user.password_hash).toEqual('hashed_differentpass');
    expect(result.token).toMatch(/^token_\d+_\d+$/);
  });
});
