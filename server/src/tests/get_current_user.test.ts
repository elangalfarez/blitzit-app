
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getCurrentUser } from '../handlers/get_current_user';

describe('getCurrentUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found by neon auth user id', async () => {
    // Create test user
    const testUser = {
      neon_auth_user_id: 'neon_auth_123',
      email: 'test@example.com',
      name: 'Test User'
    };

    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user by neon auth ID
    const result = await getCurrentUser('neon_auth_123');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.neon_auth_user_id).toEqual('neon_auth_123');
    expect(result!.email).toEqual('test@example.com');
    expect(result!.name).toEqual('Test User');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const result = await getCurrentUser('nonexistent_neon_auth_id');

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    const testUsers = [
      {
        neon_auth_user_id: 'neon_auth_user1',
        email: 'user1@example.com',
        name: 'User One'
      },
      {
        neon_auth_user_id: 'neon_auth_user2',
        email: 'user2@example.com',
        name: 'User Two'
      }
    ];

    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    // Get specific user
    const result = await getCurrentUser('neon_auth_user2');

    expect(result).not.toBeNull();
    expect(result!.neon_auth_user_id).toEqual('neon_auth_user2');
    expect(result!.email).toEqual('user2@example.com');
    expect(result!.name).toEqual('User Two');
  });

  it('should handle empty neon auth user id', async () => {
    const result = await getCurrentUser('');

    expect(result).toBeNull();
  });
});
