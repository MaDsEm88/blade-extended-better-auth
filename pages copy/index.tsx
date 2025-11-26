// pages/index.tsx
import { use } from 'blade/server/hooks';
import { useCookie } from 'blade/hooks';

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

export default function HomePage() {
  const [token] = useCookie('session');
  const sessionId = getSessionIdFromToken(token);
  
  // Check if user is logged in
  const currentSession = sessionId ? use.session.with({ id: sessionId }) : null;
  const currentAccount = currentSession?.account 
    ? use.account.with({ id: currentSession.account as string })
    : null;
  
  // If user is logged in, silently redirect to their profile
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
  
  // Show landing page for non-logged-in users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome</h1>
        <p className="text-gray-600 mb-8">Sign in to get started</p>
        <a
          href="/login"
          className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Sign In
        </a>
      </div>
    </div>
  );
}
