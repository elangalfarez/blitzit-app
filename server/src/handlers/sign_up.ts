
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const signUp = async (input: SignUpInput): Promise<AuthResponse> => {
  try {
    // Check if user already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password (in real app, use bcrypt or similar)
    const password_hash = `hashed_${input.password}`;

    // Create new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash,
        name: input.name
      })
      .returning()
      .execute();

    const user = result[0];

    // Generate token (in real app, use JWT)
    const token = `token_${user.id}_${Date.now()}`;

    return {
      user,
      token
    };
  } catch (error) {
    console.error('User sign up failed:', error);
    throw error;
  }
};
