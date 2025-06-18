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

  it('should create a new user with Neon Auth integration', async () => {
    const result = await signUp(testInput);

    // Validate user fields
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.name).toEqual('Test User');
    expect(result.user.neon_auth_user_id).toBeDefined();
    expect(result.user.neon_auth_user_id).toMatch(/^neon_\d+_/);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Validate response structure
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.token).toMatch(/^stack_token_\d+_\d+_[a-z0-9]+$/);
  });

  it('should save user to database with Neon Auth ID', async () => {
    const result = await signUp(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].neon_auth_user_id).toEqual(result.user.neon_auth_user_id);
    expect(users[0].neon_auth_user_id).toMatch(/^neon_\d+_/);
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
    expect(result.user.neon_auth_user_id).toBeDefined();
    expect(result.user.neon_auth_user_id).toMatch(/^neon_\d+_/);
    expect(result.success).toBe(true);
    expect(result.token).toMatch(/^stack_token_\d+_\d+_[a-z0-9]+$/);
  });

  it('should generate unique Neon Auth user IDs', async () => {
    const input1: SignUpInput = {
      email: 'user1@test.com',
      password: 'password123',
      name: 'User One'
    };

    const input2: SignUpInput = {
      email: 'user2@test.com',
      password: 'password123',
      name: 'User Two'
    };

    const result1 = await signUp(input1);
    const result2 = await signUp(input2);

    expect(result1.user.neon_auth_user_id).not.toEqual(result2.user.neon_auth_user_id);
    expect(result1.user.neon_auth_user_id).toMatch(/^neon_\d+_/);
    expect(result2.user.neon_auth_user_id).toMatch(/^neon_\d+_/);
  });
});