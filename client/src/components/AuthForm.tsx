
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { SignUpInput, SignInInput, User } from '../../../server/src/schema';

interface AuthFormProps {
  onAuth: (authData: { user: User; token: string }) => void;
}

export function AuthForm({ onAuth }: AuthFormProps) {
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
      const response = await trpc.signUp.mutate(signUpForm);
      onAuth(response);
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
      const response = await trpc.signIn.mutate(signInForm);
      onAuth(response);
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
          Your productivity companion
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
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
      </CardContent>
    </Card>
  );
}
