
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type SignInInput, type AuthResponse } from '../schema';

// Mock Stack Auth implementation - replace with actual @stackframe/stack when available
class MockStackAuth {
  async signInWithCredentials(credentials: { email: string; password: string }) {
    // Mock validation - in real implementation this would call Stack Auth API
    if (!credentials.email || !credentials.password) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    // Mock successful response - replace with actual Stack Auth response structure
    return {
      success: true,
      user: {
        id: `stack_user_${credentials.email.replace('@', '_').replace('.', '_')}`, // Consistent ID based on email
        primaryEmail: credentials.email,
        displayName: 'User',
      },
      accessToken: `mock_token_${Date.now()}`,
    };
  }
}

// TODO: Replace with actual Stack initialization when @stackframe/stack is available
// const stack = new StackServerApp({
//   tokenStore: 'nextjs-cookie',
// });
const stack = new MockStackAuth();

export const signIn = async (input: SignInInput): Promise<AuthResponse> => {
  try {
    // Sign in user with Stack Auth
    const authResult = await stack.signInWithCredentials({
      email: input.email,
      password: input.password,
    });

    if (!authResult.success || !authResult.user) {
      throw new Error('Invalid credentials');
    }

    // Get the Stack Auth user
    const stackUser = authResult.user;
    
    // Check if user exists in our database by email (since Stack user might be consistent)
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, stackUser.primaryEmail))
      .execute();

    let user;
    if (existingUsers.length === 0) {
      // User doesn't exist in our database, create them
      const newUser = await db.insert(usersTable)
        .values({
          neon_auth_user_id: stackUser.id,
          email: stackUser.primaryEmail || input.email,
          name: stackUser.displayName || 'User',
        })
        .returning()
        .execute();
      
      user = newUser[0];
    } else {
      // Update the existing user's neon_auth_user_id if it's different
      user = existingUsers[0];
      if (user.neon_auth_user_id !== stackUser.id) {
        const updatedUser = await db.update(usersTable)
          .set({ neon_auth_user_id: stackUser.id })
          .where(eq(usersTable.id, user.id))
          .returning()
          .execute();
        user = updatedUser[0];
      }
    }

    return {
      user,
      token: authResult.accessToken,
    };
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
};
