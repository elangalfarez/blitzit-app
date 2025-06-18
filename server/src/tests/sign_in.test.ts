import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignInInput } from '../schema';
import { signIn } from '../handlers/sign_in';
import { signUp } from '../handlers/sign_up';

const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

describe('signIn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should sign in existing user with Neon Auth', async () => {
    // First create a user
    const signUpResult = await signUp(testUser);
    
    // Then sign in with the same credentials
    const signInInput: SignInInput = {
      email: testUser.email,
      password: testUser.password
    };
    
    const result = await signIn(signInInput);

    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.name).toEqual('Test User');
    expect(result.user.neon_auth_user_id).toEqual(signUpResult.user.neon_auth_user_id);
    expect(result.user.id).toEqual(signUpResult.user.id);
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.token).toMatch(/^stack_token_\d+_\d+_[a-z0-9]+$/);
  });

  it('should reject sign in for non-existent user', async () => {
    const signInInput: SignInInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(signIn(signInInput)).rejects.toThrow(/Invalid email or password/i);
  });

  it('should handle sign in with correct Neon Auth flow', async () => {
    // Create user first
    const signUpResult = await signUp(testUser);
    
    const signInInput: SignInInput = {
      email: testUser.email,
      password: testUser.password
    };
    
    const result = await signIn(signInInput);

    // Should find the user in database by Neon Auth ID
    expect(result.user.neon_auth_user_id).toBeDefined();
    expect(result.user.neon_auth_user_id).toMatch(/^neon_\d+_/);
    expect(result.success).toBe(true);
    
    // Should return the same user data as signup
    expect(result.user.id).toEqual(signUpResult.user.id);
    expect(result.user.email).toEqual(signUpResult.user.email);
    expect(result.user.name).toEqual(signUpResult.user.name);
  });

  it('should generate new token on each sign in', async () => {
    // Create user first
    await signUp(testUser);
    
    const signInInput: SignInInput = {
      email: testUser.email,
      password: testUser.password
    };
    
    const result1 = await signIn(signInInput);
    const result2 = await signIn(signInInput);

    expect(result1.token).not.toEqual(result2.token);
    expect(result1.token).toMatch(/^stack_token_\d+_\d+_[a-z0-9]+$/);
    expect(result2.token).toMatch(/^stack_token_\d+_\d+_[a-z0-9]+$/);
  });
});