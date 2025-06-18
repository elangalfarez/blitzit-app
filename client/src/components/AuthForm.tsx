import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { useStackAuth } from './StackAuthProvider';
import type { SignUpInput, SignInInput, User } from '../../../server/src/schema';

interface AuthFormProps {
  onAuth: (authData: { user: User; token: string }) => void;
}

export function AuthForm({ onAuth }: AuthFormProps) {
  const { signUp: stackSignUp, signIn: stackSignIn, isLoading: stackLoading } = useStackAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpForm, setSignUpForm] = useState<SignUpInput>({
    email: '',
    password: '',
    name: ''
  });
  const [signInForm, setSignInForm] = useState<SignInInput>({
    email: '',
    password: ''
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // First authenticate with Stack Auth
      const stackResult = await stackSignUp(signUpForm.email, signUpForm.password, signUpForm.name);
      
      if (!stackResult.success) {
        throw new Error('Stack Auth signup failed');
      }

      // Then register with our backend
      const response = await trpc.signUp.mutate(signUpForm);
      
      if (response.success) {
        onAuth({ user: response.user, token: response.token });
      } else {
        throw new Error('Backend registration failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // First authenticate with Stack Auth
      const stackResult = await stackSignIn(signInForm.email, signInForm.password);
      
      if (!stackResult.success) {
        throw new Error('Stack Auth signin failed');
      }

      // Then authenticate with our backend
      const response = await trpc.signIn.mutate(signInForm);
      
      if (response.success) {
        onAuth({ user: response.user, token: response.token });
      } else {
        throw new Error('Backend authentication failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader className="text-center">
        <CardTitle className="text-gray-900 dark:text-white">Welcome to Blitzit</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Your productivity companion powered by Neon Auth
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={signInForm.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSignInForm((prev: SignInInput) => ({ ...prev, email: e.target.value }))
                }
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={signInForm.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSignInForm((prev: SignInInput) => ({ ...prev, password: e.target.value }))
                }
                required
              />
              <Button type="submit" className="w-full" disabled={isLoading || stackLoading}>
                {isLoading || stackLoading ? '🔐 Authenticating with Neon...' : '🚀 Sign In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <Input
                placeholder="Full Name"
                value={signUpForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSignUpForm((prev: SignUpInput) => ({ ...prev, name: e.target.value }))
                }
                required
              />
              <Input
                type="email"
                placeholder="Email"
                value={signUpForm.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSignUpForm((prev: SignUpInput) => ({ ...prev, email: e.target.value }))
                }
                required
              />
              <Input
                type="password"
                placeholder="Password (min 6 characters)"
                value={signUpForm.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSignUpForm((prev: SignUpInput) => ({ ...prev, password: e.target.value }))
                }
                minLength={6}
                required
              />
              <Button type="submit" className="w-full" disabled={isLoading || stackLoading}>
                {isLoading || stackLoading ? '🔐 Creating Neon Account...' : '✨ Sign Up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert className="mt-4 border-red-200 dark:border-red-800">
            <AlertDescription className="text-red-800 dark:text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            🔒 Powered by Neon Auth & PostgreSQL
          </p>
        </div>
      </CardContent>
    </Card>
  );
}