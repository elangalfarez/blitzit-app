import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignInInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

// Simulated Stack Auth integration
class StackAuth {
  async signInWithCredential(credentials: { email: string; password: string }) {
    // In real implementation, this would call Stack Auth API
    // For demo purposes, we'll find existing user by email and simulate auth
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, credentials.email))
      .execute();

    if (users.length === 0) {
      return { success: false, user: null };
    }

    const user = users[0];
    
    return {
      success: true,
      user: {
        id: user.neon_auth_user_id,
        primaryEmail: user.email,
        displayName: user.name
      }
    };
  }
}

const stack = new StackAuth();

export const signIn = async (input: SignInInput): Promise<AuthResponse> => {
  try {
    // Use Stack Auth to authenticate the user
    const authResult = await stack.signInWithCredential({
      email: input.email,
      password: input.password,
    });

    if (!authResult.success || !authResult.user) {
      throw new Error('Invalid email or password');
    }

    const neonAuthUserId = authResult.user.id;

    // Find user in our database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.neon_auth_user_id, neonAuthUserId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found in local database');
    }

    const user = users[0];

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
    console.error('Sign in failed:', error);
    throw error;
  }
};