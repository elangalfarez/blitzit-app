
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

  it('should create a user with all required fields', async () => {
    const result = await signUp(testInput);

    // Verify user object structure
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.name).toEqual('Test User');
    expect(result.user.id).toBeDefined();
    expect(result.user.neon_auth_user_id).toBeDefined();
    expect(typeof result.user.neon_auth_user_id).toBe('string');
    expect(result.user.neon_auth_user_id.startsWith('neon_')).toBe(true);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await signUp(testInput);

    // Verify user was saved to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].neon_auth_user_id).toBeDefined();
    expect(users[0].neon_auth_user_id.startsWith('neon_')).toBe(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle duplicate email addresses', async () => {
    // Create first user
    await signUp(testInput);

    // Attempt to create user with same email
    const duplicateInput = {
      ...testInput,
      name: 'Another User'
    };

    await expect(signUp(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should generate unique neon auth user IDs', async () => {
    const user1 = await signUp(testInput);
    
    const secondInput = {
      ...testInput,
      email: 'test2@example.com'
    };
    const user2 = await signUp(secondInput);

    expect(user1.user.neon_auth_user_id).not.toEqual(user2.user.neon_auth_user_id);
    expect(user1.user.neon_auth_user_id.startsWith('neon_')).toBe(true);
    expect(user2.user.neon_auth_user_id.startsWith('neon_')).toBe(true);
  });

  it('should link database record with neon auth user id', async () => {
    const result = await signUp(testInput);

    // Query by neon_auth_user_id to verify the link
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.neon_auth_user_id, result.user.neon_auth_user_id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].id).toEqual(result.user.id);
    expect(users[0].email).toEqual('test@example.com');
  });
});
