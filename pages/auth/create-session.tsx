// pages/auth/create-session.tsx
// This page sets the session cookie after the session was created by a trigger
import { use } from 'blade/server/hooks';
import { useLocation, useCookie } from 'blade/hooks';

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

export default function CreateSessionPage() {
  const { searchParams } = useLocation();
  const sessionId = searchParams.get('sessionId');
  const accountId = searchParams.get('accountId');
  const [existingToken, setSessionCookie] = useCookie('session');

  // If missing params, show error
  if (!sessionId || !accountId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid Request</h2>
          <p className="text-gray-600 mb-6">Missing session parameters</p>
          <a href="/login" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  // Check if we already have a valid session cookie for this session
  const existingSessionId = getSessionIdFromToken(existingToken);
  
  // Verify the session exists in the database (not deleted/expired)
  const session = use.session.with({ id: sessionId });
  
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Session Expired</h2>
          <p className="text-gray-600 mb-6">Your session has expired. Please sign in again.</p>
          <a href="/login" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  // Get the account
  const account = use.account.with({ id: accountId });
  
  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Account Not Found</h2>
          <p className="text-gray-600 mb-6">The account could not be found</p>
          <a href="/login" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  // Redirect URL
  const redirectUrl = account.handle ? `/${account.handle}` : '/';

  // If session cookie is already set for this session, just redirect immediately
  if (existingSessionId === sessionId) {
    return (
      <>
        <meta httpEquiv="refresh" content={`0; url=${redirectUrl}`} />
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace('${redirectUrl}');` }} />
      </>
    );
  }

  // Create session token and set cookie (only if not already set)
  const payload = JSON.stringify({
    iss: 'ronin',
    sub: sessionId,
    aud: accountId,
    iat: Math.floor(Date.now() / 1000),
  });
  const token = btoa(payload);
  setSessionCookie(token);

  console.log('[Create Session] Setting cookie and redirecting to:', redirectUrl);

  // Immediate redirect with JS + meta fallback
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${redirectUrl}`} />
      <script dangerouslySetInnerHTML={{ __html: `window.location.replace('${redirectUrl}');` }} />
    </>
  );
}