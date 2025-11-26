// components/email-auth-simple.client.tsx
'use client';
 
import { useState } from 'react';
import { useMutation } from 'blade/client/hooks';
 
type AuthMode = 'signin' | 'signup';
 
interface EmailAuthSimpleProps {
  mode?: AuthMode;
  onSuccess?: () => void;
}
 
export default function EmailAuthSimple({ mode = 'signin', onSuccess }: EmailAuthSimpleProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { add } = useMutation();
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
 
    try {
      if (authMode === 'signup') {
        // Create a new account
        const account = await add.account.with({
          email,
          password,
          emailVerified: true,
        });

        if (account) {
          // Create session for new account
          const sessionId = `ses_${crypto.randomUUID()}`;
          await add.session.with({
            id: sessionId,
            account: account.id,
            browser: 'unknown',
            browserVersion: 'unknown',
            os: 'unknown',
            osVersion: 'unknown',
            deviceType: 'web',
            activeAt: new Date(),
          });

          // Redirect to session creation
          window.location.href = `/auth/create-session?sessionId=${sessionId}&accountId=${account.id}`;
        }
      } else {
        // Sign in: resolve existing account via link resolution and create session
        // Blade will resolve account by email+password on the server
        const session = await add.session.with.account({
          email,
          password,
        });

        if (!session || !session.id || !session.account) {
          throw new Error('Invalid email or password');
        }

        const sessionId = session.id as string;
        const accountId = session.account as string;

        window.location.href = `/auth/create-session?sessionId=${sessionId}&accountId=${accountId}`;
      }
    } catch (err) {
      console.error('[EmailAuthSimple] Error:', err);
      setError('Failed to sign in. Please check your email and password and try again.');
    } finally {
      setIsLoading(false);
    }
  };
 
  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="text-center">
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setAuthMode('signin')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              authMode === 'signin'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthMode('signup')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              authMode === 'signup'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign Up
          </button>
        </div>
      </div>
 
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
 
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            required
          />
        </div>
 
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••••"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            required
          />
        </div>
 
        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading 
            ? (authMode === 'signup' ? 'Creating Account...' : 'Signing In...')
            : (authMode === 'signup' ? 'Create Account' : 'Sign In')
          }
        </button>
      </form>
    </div>
  );
}