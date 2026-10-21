import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to top on navigation, or to the #anchor when present (e.g. /#how-it-works). */
export default function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 120);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash]);
  return null;
}
