import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput, type AuthResponse } from '../schema';
import { auth } from '@neon/auth'; // 👈 Make sure this is the correct SDK you're using

export const signUp = async (_: SignUpInput): Promise<AuthResponse> => {
  try {
    // ✅ Get Neon Auth session
    const session = await auth(); // Or however your app gets Neon Auth session
    const user = session?.user;

    if (!user) {
      throw new Error('Neon Auth session not found');
    }

    // ✅ Insert user into your own users table (if not already there)
    const result = await db
      .insert(usersTable)
      .values({
        neon_auth_user_id: user.id,
        email: user.email,
        name: user.name
      })
      .onConflictDoNothing() // 👈 Avoid duplicate insert if already exists
      .returning()
      .execute();

    const insertedUser = result[0] ?? {
      // 👇 fallback if user already existed (you may want to fetch instead)
      id: -1,
      neon_auth_user_id: user.id,
      email: user.email,
      name: user.name,
      created_at: new Date(),
      updated_at: new Date()
    };

    return {
      user: {
        id: insertedUser.id,
        neon_auth_user_id: insertedUser.neon_auth_user_id,
        email: insertedUser.email,
        name: insertedUser.name,
        created_at: insertedUser.created_at,
        updated_at: insertedUser.updated_at
      }
    };
  } catch (error) {
    console.error('Sign up failed:', error);
    throw error;
  }
};
