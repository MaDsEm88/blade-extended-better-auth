// components/email-auth.client.tsx
'use client';

import { useState } from 'react';
import { useMutation } from 'blade/client/hooks';

type AuthMode = 'signin' | 'signup';
type AuthMethod = 'otp' | 'password';
type AuthStep = 'method-select' | 'email' | 'password' | 'otp-verify' | 'success';

interface EmailAuthProps {
  mode?: AuthMode;
  onSuccess?: () => void;
}

interface EmailAuthResult {
  exists?: boolean;
  hasPassword?: boolean;
  accountId?: string;
  sessionId?: string;
  handle?: string;
  success?: boolean;
  error?: string;
  requiresOTP?: boolean;
  otpSent?: boolean;
  emailVerified?: boolean;
}

export default function EmailAuth({ mode = 'signin', onSuccess }: EmailAuthProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(mode);
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [step, setStep] = useState<AuthStep>('method-select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);

  const { add } = useMutation();
 
  // Call the email-auth trigger via emailAuthRequest model
  const callEmailAuth = async (action: string, data: Record<string, any> = {}): Promise<EmailAuthResult> => {
    try {
      console.log('[EmailAuth] Calling action:', action, 'for email:', email);
      const result = await (add as any).emailAuthRequest.with({
        action,
        email,
        password: data['password'] || null,
        otp: data['otp'] || null,
      });
      console.log('[EmailAuth] Result:', result);
      // The result fields are directly on the record
      return {
        success: (result as any)?.success ?? false,
        error: (result as any)?.error,
        exists: (result as any)?.exists,
        hasPassword: (result as any)?.hasPassword,
        accountId: (result as any)?.accountId,
        sessionId: (result as any)?.sessionId,
        handle: (result as any)?.handle,
        requiresOTP: (result as any)?.requiresOTP,
        otpSent: (result as any)?.otpSent,
        emailVerified: (result as any)?.emailVerified,
      };
    } catch (err: any) {
      console.error('[EmailAuth] Trigger error:', err);
      return { success: false, error: err?.message || 'Request failed' };
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await callEmailAuth('check-email');
      console.log('[EmailAuth] check-email result:', { exists: result.exists, hasPassword: result.hasPassword, authMode, authMethod });

      if (authMode === 'signin' && !result.exists) {
        setError('No account found with this email. Try signing up instead.');
        setIsLoading(false);
        return;
      }

      if (authMode === 'signup' && result.exists) {
        setError('An account with this email already exists. Try signing in instead.');
        setIsLoading(false);
        return;
      }

      if (result.accountId) {
        setCurrentAccountId(result.accountId);
      }

      // For email/password method
      if (authMethod === 'password') {
        console.log('[EmailAuth] Going to password step');
        setStep('password');
        setIsLoading(false);
        return;
      }
      
      // For OTP method
      if (authMode === 'signup') {
        console.log('[EmailAuth] Calling signupWithOTP');
        await signupWithOTP();
      } else {
        console.log('[EmailAuth] Calling sendOTP for signin');
        await sendOTP();
      }
    } catch (err) {
      console.error('[EmailAuth] handleEmailSubmit error:', err);
      setError('Failed to check email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
 
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await callEmailAuth('signin', { password });

      if (!result.success) {
        setError(result.error || 'Invalid password');
        setIsLoading(false);
        return;
      }

      // Create session with verified account
      if (result.accountId) {
        await createSession(result.accountId);
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
 
  // For OTP-only signup (no password)
  const signupWithOTP = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await callEmailAuth('signup-otp');

      if (!result.success) {
        setError(result.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      if (result.accountId) {
        setCurrentAccountId(result.accountId);
      }

      setMessage(`A verification code has been sent to ${email}`);
      setStep('otp-verify');
    } catch (err) {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // For OTP signin (existing account)
  const sendOTP = async () => {
    console.log('[EmailAuth] sendOTP called');
    setIsLoading(true);
    setError(null);

    try {
      console.log('[EmailAuth] Calling send-otp action');
      const result = await callEmailAuth('send-otp');
      console.log('[EmailAuth] send-otp result:', result);

      if (!result.success) {
        console.log('[EmailAuth] send-otp failed:', result.error);
        setError(result.error || 'Failed to send verification code');
        setIsLoading(false);
        return;
      }

      if (result.accountId) {
        setCurrentAccountId(result.accountId);
      }

      console.log('[EmailAuth] OTP sent, going to otp-verify step');
      setMessage(`A verification code has been sent to ${email}`);
      setStep('otp-verify');
    } catch (err) {
      console.error('[EmailAuth] sendOTP error:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
 
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const otpValue = otp.join('');

    if (otpValue.length !== 6) {
      setError('Please enter a 6-digit code');
      setIsLoading(false);
      return;
    }

    try {
      const result = await callEmailAuth('verify-otp', { otp: otpValue });
      console.log('[EmailAuth] verify-otp result:', result);

      if (!result.success) {
        setError(result.error || 'Invalid code. Please try again.');
        setIsLoading(false);
        return;
      }

      // Session was created by the trigger - redirect to finalize
      if (result.sessionId && result.accountId) {
        console.log('[EmailAuth] Redirecting to create-session with sessionId:', result.sessionId);
        window.location.href = `/auth/create-session?sessionId=${result.sessionId}&accountId=${result.accountId}`;
      } else {
        setError('Session creation failed. Please try again.');
      }
    } catch (err) {
      console.error('[EmailAuth] verify-otp error:', err);
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
 
  const handlePasswordCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // For signup: create account with password, then send OTP
      const result = await callEmailAuth('signup', { password });

      if (!result.success) {
        setError(result.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      if (result.accountId) {
        setCurrentAccountId(result.accountId);
      }

      // Account created, OTP sent - go to OTP step
      if (result.requiresOTP) {
        setMessage(`A verification code has been sent to ${email}`);
        setStep('otp-verify');
      }
    } catch (err) {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createSession = async (accountId: string) => {
    try {
      console.log('[EmailAuth] Creating session for account:', accountId);
      
      // Create session - Blade will auto-generate the ID
      const sessionData = {
        account: { id: accountId },
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                 navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                 navigator.userAgent.includes('Safari') ? 'Safari' : 'unknown',
        browserVersion: 'unknown',
        os: navigator.platform || 'unknown',
        osVersion: 'unknown',
        deviceType: 'web' as const,
        activeAt: new Date(),
      };
      
      console.log('[EmailAuth] Session data:', sessionData);
      
      const session = await add.session.with(sessionData);

      console.log('[EmailAuth] Session created result:', session);
      console.log('[EmailAuth] Session type:', typeof session);
      console.log('[EmailAuth] Session keys:', session ? Object.keys(session) : 'null');
      
      // Get the session ID from the created record
      const sessionId = (session as any)?.id;
      
      console.log('[EmailAuth] Extracted session ID:', sessionId);
      
      if (!sessionId) {
        console.error('[EmailAuth] No session ID in response:', session);
        throw new Error('Failed to get session ID');
      }

      // Redirect to session creation page to set cookie and go to profile
      window.location.href = `/auth/create-session?sessionId=${sessionId}&accountId=${accountId}`;
    } catch (err) {
      console.error('[EmailAuth] createSession error:', err);
      setError('Failed to create session. Please try again.');
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOTP = [...otp];
    newOTP[index] = value;
    setOtp(newOTP);
 
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };
 
  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };
 
  const resetForm = () => {
    setStep('method-select');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setOtp(['', '', '', '', '', '']);
    setError(null);
    setMessage(null);
    setAuthMethod(null);
    setCurrentAccountId(null);
  };
 
  // Method Selection Step - Show OTP vs Email/Password options
  if (step === 'method-select') {
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

        <div className="space-y-3">
          <button
            onClick={() => {
              setAuthMethod('otp');
              setStep('email');
            }}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {authMode === 'signin' ? 'Sign in with Email Code' : 'Sign up with Email Code'}
          </button>

          <button
            onClick={() => {
              setAuthMethod('password');
              setStep('email');
            }}
            className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {authMode === 'signin' ? 'Sign in with Password' : 'Sign up with Password'}
          </button>
        </div>
      </div>
    );
  }
 
  // Success state
  if (step === 'success') {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {authMode === 'signup' ? 'Account Created!' : 'Welcome Back!'}
        </h2>
        <p className="text-gray-600 mb-6">
          {authMode === 'signup' 
            ? 'Your account has been created successfully.' 
            : 'You have been signed in successfully.'}
        </p>
        <button
          onClick={onSuccess}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
        >
          Continue
        </button>
      </div>
    );
  }
 
  return (
    <div className="space-y-6">
      {/* Header showing current method */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-600">
          {authMode === 'signin' ? 'Sign in' : 'Sign up'} with {authMethod === 'otp' ? 'email code' : 'password'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Info Message */}
      {message && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}

      {/* Email Step */}
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
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
 
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Checking...' : 'Continue'}
          </button>
        </form>
      )}
 
      {/* Password Step */}
      {step === 'password' && (
        <form onSubmit={authMode === 'signup' ? handlePasswordCreate : handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>
 
          {authMode === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
          )}
 
          <button
            type="submit"
            disabled={isLoading || !password || (authMode === 'signup' && !confirmPassword)}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading 
              ? (authMode === 'signup' ? 'Creating Account...' : 'Signing In...')
              : (authMode === 'signup' ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>
      )}
 
      {/* OTP Verification Step */}
      {step === 'otp-verify' && (
        <form onSubmit={handleOTPSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Enter the 6-digit code sent to {email}
            </label>
            <div className="flex gap-2 justify-center">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
              ))}
            </div>
          </div>
 
          <div className="text-center">
            <button
              type="button"
              onClick={() => sendOTP()}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Didn't receive the code? Resend
            </button>
          </div>
 
          <button
            type="submit"
            disabled={isLoading || otp.join('').length !== 6}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      )}
 
      {/* Back button */}
      <button
        type="button"
        onClick={resetForm}
        className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 transition-all"
      >
        ← Back to options
      </button>
    </div>
  );
}