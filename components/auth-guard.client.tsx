// components/auth-guard.client.tsx
'use client';

import { useEffect } from 'react';

// Pages that should redirect to profile when authenticated
const PUBLIC_ONLY_PAGES = ['/', '/login', '/signup', '/auth/login'];

/**
 * Client-side auth guard that prevents navigation to public-only pages
 * when the user is authenticated. Intercepts clicks on links and
 * browser navigation events.
 */
export default function AuthGuard({ 
  handle, 
  children 
}: { 
  handle: string | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!handle) return;

    // Intercept link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      if (!href) return;
      
      // Check if this is a public-only page
      const isPublicOnly = PUBLIC_ONLY_PAGES.some(page => 
        href === page || href.startsWith(page + '?')
      );
      
      if (isPublicOnly) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Intercept browser back/forward navigation
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const isPublicOnly = PUBLIC_ONLY_PAGES.some(page => 
        currentPath === page || currentPath.startsWith(page + '?')
      );
      
      if (isPublicOnly) {
        window.history.pushState(null, '', `/${handle}`);
      }
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handle]);

  return <>{children}</>;
}
