import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth, homeFor } from '../context/AuthContext';

export const NAV_LINKS = [
  { label: 'Home', to: '/' }, { label: 'Vendors', to: '/vendors' }, { label: 'Inspiration', to: '/inspiration' },
  { label: 'How It Works', to: '/#how-it-works' }, { label: 'About', to: '/about' }, { label: 'Contact', to: '/contact' },
];

/** Transparent over the landing hero, solid ivory once scrolled (or always, on inner pages via `solid`). */
export default function Navbar({ solid: forceSolid = false }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 60);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { setDrawer(false); }, [pathname]);
  useEffect(() => { document.body.style.overflow = drawer ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [drawer]);

  const solid = forceSolid || scrolled;
  const start = user ? homeFor(user.role) : '/register';

  return (
    <>
      <header className={'nav' + (solid ? ' solid' : '')}>
        <Link to="/" className="nav__logo" aria-label="KnotNest home">
          <span className="mark" aria-hidden="true" />Knot<em>Nest</em>
        </Link>
        <nav className="nav__center" aria-label="Main">
          {NAV_LINKS.map((l) => (l.to.includes('#')
            ? <Link key={l.label} to={l.to}>{l.label}</Link>
            : <NavLink key={l.label} to={l.to} end={l.to === '/'}>{l.label}</NavLink>))}
        </nav>
        <div className="nav__right">
          <Link className="nav__icon" to="/vendors" aria-label="Search vendors"><Search size={18} strokeWidth={1.4} /></Link>
          {user ? <Link className="nav__login" to={homeFor(user.role)}>Dashboard</Link> : <Link className="nav__login" to="/login">Login</Link>}
          <Link className="nav__cta" to={start}>{user ? 'My Account' : 'Get Started'}</Link>
          <button className="nav__burger" aria-label="Open menu" onClick={() => setDrawer(true)}><span /></button>
        </div>
      </header>
      <div className={'drawer' + (drawer ? ' open' : '')} aria-hidden={!drawer}>
        <button className="drawer__close" onClick={() => setDrawer(false)}>Close ×</button>
        <nav>
          {NAV_LINKS.map((l) => <Link key={l.label} to={l.to} onClick={() => setDrawer(false)}>{l.label}</Link>)}
          {user ? <Link to={homeFor(user.role)}>Dashboard</Link> : <Link to="/login">Login</Link>}
        </nav>
        <Link to={start} className="drawer__cta">{user ? 'My Account' : 'Get Started'}</Link>
      </div>
    </>
  );
}
