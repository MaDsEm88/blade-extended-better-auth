// pages/auth/callback.tsx
import { useLocation } from 'blade/hooks';
import CallbackHandler from '../../components/callback-handler.client';

export default function CallbackPage() {
  const { searchParams } = useLocation();

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // If the OAuth provider returned an explicit error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Cancelled
            </h2>
            <p className="text-gray-600 mb-6">
              {searchParams.get('error_description') ||
                'The authentication was cancelled or failed'}
            </p>

            <a
              href="/login"
              className="inline-block w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // If required params are missing, treat as invalid callback
  if (!code || !state) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Callback
            </h2>
            <p className="text-gray-600 mb-6">
              Missing required parameters. Please try logging in again.
            </p>

            <a
              href="/login"
              className="inline-block w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // The trigger will look up the provider from the OAuth state record
  return (
    <CallbackHandler
      code={code}
      state={state}
    />
  );
}