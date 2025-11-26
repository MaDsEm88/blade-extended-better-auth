// pages/auth/verify-oauth.tsx
import { use } from 'blade/server/hooks';
import { useLocation, useCookie } from 'blade/hooks';

export default function VerifyOAuthPage() {
  const { searchParams } = useLocation();
  const state = searchParams.get('state');
  const attempt = parseInt(searchParams.get('attempt') || '0', 10);
  const maxAttempts = 8;

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid Request</h2>
          <p className="text-gray-600 mb-6">Missing authentication state</p>
          <a href="/login" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  // Query oauthState - use must be called at top level
  const oauthState = use.oauthState.with({ state });

  // If oauthState not found
  if (!oauthState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Session Expired</h2>
          <p className="text-gray-600 mb-6">OAuth state not found. It may have expired.</p>
          <a href="/login" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  // If account isn't linked yet, show loading and retry
  if (!oauthState.account || !oauthState.sessionId) {
    if (attempt < maxAttempts) {
      const progress = Math.min(Math.round((attempt / maxAttempts) * 100), 95);

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="mx-auto w-16 h-16 mb-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {attempt === 0 ? 'Processing Authentication' : 'Almost There'}
            </h2>
            <p className="text-gray-600 mb-6">
              {attempt === 0
                ? 'Exchanging tokens and setting up your account...'
                : 'Finalizing your authentication...'}
            </p>

            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <meta httpEquiv="refresh" content={`2; url=/auth/verify-oauth?state=${state}&attempt=${attempt + 1}`} />

            <p className="text-xs text-gray-500">
              Verifying... ({attempt + 1}/{maxAttempts})
            </p>
          </div>
        </div>
      );
    }

    // Max attempts reached
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Failed</h2>
          <p className="text-gray-600 mb-6">
            Authentication is taking longer than expected. Please try again.
          </p>
          <a href="/login" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Try Again
          </a>
        </div>
      </div>
    );
  }

  // Get account and session details
  const accountId = typeof oauthState.account === 'string'
    ? oauthState.account
    : oauthState.account.id;

  const account = use.account.with({ id: accountId });
  const sessionId = oauthState.sessionId;

  if (!account || !sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Failed</h2>
          <p className="text-gray-600 mb-6">Account or session not found.</p>
          <a href="/login" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Try Again
          </a>
        </div>
      </div>
    );
  }

  // Create session token using a simple base64 encoding
  const payload = JSON.stringify({
    iss: 'ronin',
    sub: sessionId,
    aud: account.id,
    iat: Math.floor(Date.now() / 1000),
  });
  // Simple token: base64 encoded payload (for now - proper JWT signing should happen in a trigger)
  const token = btoa(payload);

  // Set session cookie
  const [, setSessionCookie] = useCookie('session');
  setSessionCookie(token);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 9" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
        <p className="text-gray-600 mb-6">
          Successfully signed in as <span className="font-medium">{account.name || account.email}</span>
        </p>
        <meta httpEquiv="refresh" content={`1; url=/${account.handle || 'dashboard'}`} />
        <p className="text-sm text-gray-500">Redirecting to your profile...</p>
      </div>
    </div>
  );
}