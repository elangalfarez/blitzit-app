import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface StackUser {
  id: string;
  email: string;
  name: string;
}

interface StackAuthContextType {
  user: StackUser | null;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; user?: StackUser }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; user?: StackUser }>;
  signOut: () => void;
  isLoading: boolean;
}

const StackAuthContext = createContext<StackAuthContextType | undefined>(undefined);

// Simulated Stack Auth client
class StackClientApp {
  private user: StackUser | null = null;

  constructor() {
    // Load user from localStorage if available
    const savedUser = localStorage.getItem('stack_auth_user');
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch (error) {
        console.error('Failed to parse saved Stack user:', error);
        localStorage.removeItem('stack_auth_user');
      }
    }
  }

  async signUp(email: string, password: string, name: string) {
    // Simulate Stack Auth signup
    const stackUser: StackUser = {
      id: `stack_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name
    };

    this.user = stackUser;
    localStorage.setItem('stack_auth_user', JSON.stringify(stackUser));

    return { success: true, user: stackUser };
  }

  async signIn(email: string, password: string) {
    // Simulate Stack Auth signin by checking if user exists in localStorage
    // In real implementation, this would authenticate with Stack Auth servers
    console.log('Simulating Stack Auth signin for:', email, 'with password length:', password.length);
    
    const stackUser: StackUser = {
      id: `stack_user_${email.replace('@', '_').replace('.', '_')}`,
      email,
      name: 'User' // Would come from Stack Auth
    };

    this.user = stackUser;
    localStorage.setItem('stack_auth_user', JSON.stringify(stackUser));

    return { success: true, user: stackUser };
  }

  signOut() {
    this.user = null;
    localStorage.removeItem('stack_auth_user');
    localStorage.removeItem('blitzit_user');
    localStorage.removeItem('blitzit_token');
  }

  getCurrentUser() {
    return this.user;
  }
}

export function StackAuthProvider({ children }: { children: ReactNode }) {
  const [stackClient] = useState(() => new StackClientApp());
  const [user, setUser] = useState<StackUser | null>(stackClient.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for user on mount
    const currentUser = stackClient.getCurrentUser();
    setUser(currentUser);
  }, [stackClient]);

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const result = await stackClient.signUp(email, password, name);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await stackClient.signIn(email, password);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    stackClient.signOut();
    setUser(null);
  };

  return (
    <StackAuthContext.Provider
      value={{
        user,
        signUp,
        signIn,
        signOut,
        isLoading
      }}
    >
      {children}
    </StackAuthContext.Provider>
  );
}

export function useStackAuth() {
  const context = useContext(StackAuthContext);
  if (context === undefined) {
    throw new Error('useStackAuth must be used within a StackAuthProvider');
  }
  return context;
}