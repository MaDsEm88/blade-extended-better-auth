// components/callback-handler.client.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useMutation } from 'blade/client/hooks';

interface CallbackHandlerProps {
  code: string;
  state: string;
}

export default function CallbackHandler({ code, state }: CallbackHandlerProps) {
  const { add } = useMutation();
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const processCallback = async () => {
      try {
        console.log('[Callback] Processing OAuth callback');

        // FIXED: No longer pass provider, it will be looked up from state
        await add.oauthCallback.with({
          code,
          state,
        });

        console.log('[Callback] Record created, redirecting to verification...');
        window.location.href = `/auth/verify-oauth?state=${state}`;

      } catch (err) {
        console.error('[Callback] Error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    processCallback();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="/login" className="inline-block w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 mb-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Authentication</h2>
        <p className="text-gray-600">Completing your sign in...</p>
      </div>
    </div>
  );
}
