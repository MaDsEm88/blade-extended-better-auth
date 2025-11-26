// pages/login.tsx
import { use } from 'blade/server/hooks';
import { useLocation, useCookie } from 'blade/hooks';
import { LoginButton } from '../components/login-button.client';
import EmailAuth from '../components/email-auth.client';

// Helper to decode session token
function getSessionIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const { searchParams } = useLocation();
  const [token] = useCookie('session');
  const sessionId = getSessionIdFromToken(token);
  
  // Check if user is logged in
  const currentSession = sessionId ? use.session.with({ id: sessionId }) : null;
  const currentAccount = currentSession?.account 
    ? use.account.with({ id: currentSession.account as string })
    : null;
  
  // If user is already logged in, silently redirect to their profile
  // Use both meta refresh AND a script for fastest possible redirect
  if (currentAccount?.handle) {
    const redirectUrl = `/${currentAccount.handle}`;
    return (
      <html>
        <head>
          <meta httpEquiv="refresh" content={`0; url=${redirectUrl}`} />
          <script dangerouslySetInnerHTML={{ __html: `window.location.replace("${redirectUrl}")` }} />
        </head>
        <body style={{ margin: 0, padding: 0, background: '#f9fafb' }} />
      </html>
    );
  }
 
  // Check for error in URL params
  const urlError = searchParams.get('error');
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to continue to your account
          </p>
        </div>
 
        {/* Error Message */}
        {urlError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              {urlError === 'missing_params' 
                ? 'Missing authentication parameters' 
                : urlError === 'callback_failed'
                ? 'Authentication failed. Please try again.'
                : urlError === 'invalid_state'
                ? 'Invalid authentication state. Please try again.'
                : urlError === 'state_expired'
                ? 'Authentication session expired. Please try again.'
                : urlError}
            </p>
          </div>
        )}
 
        {/* OAuth Buttons */}
        <div className="space-y-3 mb-8">
          <LoginButton provider="google" />
          <LoginButton provider="github" />
          <LoginButton provider="linear" />
        </div>
 
        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">
              Or continue with email
            </span>
          </div>
        </div>
 
        {/* Email Authentication (OTP + password) */}
        <EmailAuth onSuccess={() => window.location.href = '/'} />
 
        {/* Terms */}
        <div className="relative mt-8">
          <p className="text-center text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-700">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="underline hover:text-gray-700">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}	