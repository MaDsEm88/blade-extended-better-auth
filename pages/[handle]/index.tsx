// pages/[handle]/index.tsx
import { use } from 'blade/server/hooks';
import { useParams, useCookie } from 'blade/hooks';
import { LogoutButton } from '../../components/logout-button.client';
import AuthGuard from '../../components/auth-guard.client';

// Helper to decode session token (not a hook, just a function)
function getSessionIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export default function UserProfilePage() {
  const params = useParams();
  const handleParam = params['handle'];
  const handle = Array.isArray(handleParam) ? handleParam[0] : (handleParam || '');
  const [token] = useCookie('session');
  const sessionId = getSessionIdFromToken(token);
  
  // Get the account by handle (the profile being viewed)
  const account = use.account.with({ handle });
  
  // Get current user's session if logged in
  const currentSession = sessionId ? use.session.with({ id: sessionId }) : null;
  const currentAccount = currentSession?.account 
    ? use.account.with({ id: currentSession.account as string })
    : null;
  
  // Require authentication to view any profile
  if (!currentSession || !currentAccount) {
    return (
      <>
        <meta httpEquiv="refresh" content="0; url=/login" />
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace('/login');` }} />
      </>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
          <p className="text-gray-600 mb-6">
            The user @{handle} doesn't exist.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }
  
  // Check if this is the current user's own profile
  const isOwnProfile = currentAccount?.id === account.id;
  
  // Get social accounts for this user
  const socialAccounts = use.socialAccounts.with({ account: account.id });

  return (
    <AuthGuard handle={currentAccount?.handle || null}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/" className="text-xl font-bold text-gray-900">My App</a>
            </div>
            <div className="flex items-center gap-4">
              {currentAccount ? (
                <>
                  <span className="text-sm text-gray-700">
                    {currentAccount.name || currentAccount.email}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <a
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Sign In
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-8">
            <div className="flex items-center gap-6">
              {account.image ? (
                <img
                  src={account.image}
                  alt={account.name || account.handle || handle || 'User'}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-400">
                    {(account.name || account.handle || handle || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="text-white">
                <h1 className="text-3xl font-bold">{account.name || account.handle || handle}</h1>
                <p className="text-blue-100">@{account.handle || handle}</p>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="p-6">
            {isOwnProfile && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  This is your profile. Only you can see this message.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {/* Account Info */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Account Information</h2>
                <dl className="space-y-2">
                  <div className="flex">
                    <dt className="w-32 text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">
                      {isOwnProfile ? account.email : '••••••••@••••.com'}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-32 text-sm font-medium text-gray-500">Handle</dt>
                    <dd className="text-sm text-gray-900">@{account.handle}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-32 text-sm font-medium text-gray-500">Verified</dt>
                    <dd className="text-sm">
                      {account.emailVerified ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Not Verified
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Connected Accounts - Only show on own profile */}
              {isOwnProfile && socialAccounts && socialAccounts.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Connected Accounts</h2>
                  <ul className="space-y-2">
                    {socialAccounts.map((social: any) => (
                      <li
                        key={social.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600 uppercase">
                            {social.provider[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium capitalize">{social.provider}</div>
                          <div className="text-sm text-gray-500">Connected</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
