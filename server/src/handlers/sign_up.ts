
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput, type AuthResponse } from '../schema';

export const signUp = async (input: SignUpInput): Promise<AuthResponse> => {
  try {
    // For now, we'll simulate the Neon Auth user creation
    // In a real implementation, this would use the actual Neon Auth SDK
    const neonAuthUserId = session.user.id;

    // Create user record in our database with the Neon Auth user ID
    const result = await db.insert(usersTable)
      .values({
        neon_auth_user_id: neonAuthUserId,
        email: input.email,
        name: input.name
      })
      .returning()
      .execute();

    const user = result[0];

    return {
      user: {
        id: user.id,
        neon_auth_user_id: user.neon_auth_user_id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    };
  } catch (error) {
    console.error('Sign up failed:', error);
    throw error;
  }
};
