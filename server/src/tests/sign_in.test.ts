
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type SignInInput } from '../schema';
import { signIn } from '../handlers/sign_in';

const testInput: SignInInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('signIn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should sign in new user and create database record', async () => {
    const result = await signIn(testInput);

    expect(result.user.email).toEqual(testInput.email);
    expect(result.user.name).toEqual('User');
    expect(result.user.neon_auth_user_id).toBeDefined();
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
  });

  it('should return existing user if already in database', async () => {
    // Create a user first
    const existingUser = await db.insert(usersTable)
      .values({
        neon_auth_user_id: 'old_stack_id',
        email: testInput.email,
        name: 'Existing User',
      })
      .returning()
      .execute();

    const result = await signIn(testInput);

    expect(result.user.id).toEqual(existingUser[0].id);
    expect(result.user.email).toEqual(testInput.email);
    expect(result.user.name).toEqual('Existing User');
    // Should update the neon_auth_user_id to the new one from Stack
    expect(result.user.neon_auth_user_id).not.toEqual('old_stack_id');
  });

  it('should save user to database', async () => {
    const result = await signIn(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual(testInput.email);
    expect(users[0].neon_auth_user_id).toBeDefined();
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject invalid credentials', async () => {
    const invalidInput: SignInInput = {
      email: '',
      password: 'wrongpassword'
    };

    await expect(signIn(invalidInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should handle missing password', async () => {
    const inputWithoutPassword: SignInInput = {
      email: 'test@example.com',
      password: ''
    };

    await expect(signIn(inputWithoutPassword)).rejects.toThrow(/invalid credentials/i);
  });

  it('should generate consistent user IDs for same email', async () => {
    const firstResult = await signIn(testInput);
    
    // Sign in again with same credentials
    const secondResult = await signIn(testInput);

    expect(firstResult.user.neon_auth_user_id).toEqual(secondResult.user.neon_auth_user_id);
    expect(firstResult.user.id).toEqual(secondResult.user.id);
    expect(firstResult.user.email).toEqual(secondResult.user.email);
  });

  it('should generate different user IDs for different emails', async () => {
    const firstInput: SignInInput = {
      email: 'user1@example.com',
      password: 'password123'
    };

    const secondInput: SignInInput = {
      email: 'user2@example.com',
      password: 'password123'
    };

    const firstResult = await signIn(firstInput);
    const secondResult = await signIn(secondInput);

    expect(firstResult.user.neon_auth_user_id).not.toEqual(secondResult.user.neon_auth_user_id);
    expect(firstResult.user.id).not.toEqual(secondResult.user.id);
    expect(firstResult.user.email).not.toEqual(secondResult.user.email);
  });
});
