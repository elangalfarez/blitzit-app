import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

// Simulated Stack Auth integration
class StackAuth {
  async signUpWithCredential(credentials: { email: string; password: string }) {
    // In real implementation, this would call Stack Auth API
    // For now, we'll simulate the behavior
    const neonAuthUserId = `neon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      user: {
        id: neonAuthUserId,
        primaryEmail: credentials.email,
        displayName: null
      }
    };
  }
}

const stack = new StackAuth();

export const signUp = async (input: SignUpInput): Promise<AuthResponse> => {
  try {
    // Check if user already exists by email first
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Use Stack Auth to create the user
    const authResult = await stack.signUpWithCredential({
      email: input.email,
      password: input.password,
    });

    if (!authResult.success) {
      throw new Error('Failed to create user with Stack Auth');
    }

    const neonAuthUserId = authResult.user.id;

    // Create user in our database
    const result = await db.insert(usersTable)
      .values({
        neon_auth_user_id: neonAuthUserId,
        email: input.email,
        name: input.name
      })
      .returning()
      .execute();
    
    const user = result[0];

    // Generate token (in real app, Stack Auth would handle this)
    const token = `stack_token_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      user: {
        id: user.id,
        neon_auth_user_id: user.neon_auth_user_id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      success: true,
      token
    };
  } catch (error) {
    console.error('User sign up failed:', error);
    throw error;
  }
};