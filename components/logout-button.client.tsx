// components/logout-button.client.tsx
'use client';

import { useState } from 'react';
import { useMutation } from 'blade/client/hooks';
import { useCookie } from 'blade/hooks';

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const { remove } = useMutation();
  const [, setSessionCookie] = useCookie('session');

  const handleLogout = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      // Clear our custom session cookie used for handle-based routing
      setSessionCookie('');
      // Remove Blade session (DB + Blade's own cookie) and let Blade redirect
      await remove.session(undefined, { redirect: '/' });
    } catch (err) {
      console.error('Logout failed:', err);
      // Best-effort clear even on error
      setSessionCookie('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}