import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scroll to viewport top on route change. Skips when navigating into Landing
// with a hash anchor (e.g. /#features) so the browser's native anchor scroll
// can land on the right section, and skips Landing's own internal scrolling
// (the page has scroll-snap sections that should not be reset).
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (pathname === '/') return;
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}
