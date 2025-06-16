
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignInInput } from '../schema';
import { signIn } from '../handlers/sign_in';

// Test user data
const testUserData = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

const testInput: SignInInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('signIn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should sign in user with valid credentials', async () => {
    // Create test user with hashed password
    const hashedPassword = await Bun.password.hash(testUserData.password);
    await db.insert(usersTable)
      .values({
        email: testUserData.email,
        password_hash: hashedPassword,
        name: testUserData.name
      })
      .execute();

    const result = await signIn(testInput);

    // Verify response structure
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    
    // Verify user data
    expect(result.user.email).toEqual(testUserData.email);
    expect(result.user.name).toEqual(testUserData.name);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent email', async () => {
    const invalidInput: SignInInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(signIn(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user
    const hashedPassword = await Bun.password.hash(testUserData.password);
    await db.insert(usersTable)
      .values({
        email: testUserData.email,
        password_hash: hashedPassword,
        name: testUserData.name
      })
      .execute();

    const invalidInput: SignInInput = {
      email: testUserData.email,
      password: 'wrongpassword'
    };

    await expect(signIn(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should generate token for valid authentication', async () => {
    // Create test user
    const hashedPassword = await Bun.password.hash(testUserData.password);
    await db.insert(usersTable)
      .values({
        email: testUserData.email,
        password_hash: hashedPassword,
        name: testUserData.name
      })
      .execute();

    const result = await signIn(testInput);

    // Verify token is a non-empty string
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('should return complete user object', async () => {
    // Create test user
    const hashedPassword = await Bun.password.hash(testUserData.password);
    const insertResult = await db.insert(usersTable)
      .values({
        email: testUserData.email,
        password_hash: hashedPassword,
        name: testUserData.name
      })
      .returning()
      .execute();

    const result = await signIn(testInput);

    // Verify all user fields are present
    expect(result.user.id).toEqual(insertResult[0].id);
    expect(result.user.email).toEqual(testUserData.email);
    expect(result.user.name).toEqual(testUserData.name);
    expect(result.user.password_hash).toEqual(hashedPassword);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
  });
});
