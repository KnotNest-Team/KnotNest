import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { notificationApi } from '../services/api';
import { imgUrl, initials } from '../utils/format';

const TITLES = { customer: 'Customer', vendor: 'Vendor', admin: 'Admin' };

/** Shared shell for customer / vendor / admin areas. `variant` picks the theme and `items` the sidebar. */
export default function DashboardLayout({ variant, items, subtitle }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const unread = useFetch(() => notificationApi.list(), [pathname]);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const count = unread.data?.unread || 0;
  const base = `/${variant === 'admin' ? 'admin' : variant}`;

  return (
    <div className="flex min-h-screen bg-ivory font-sans">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block"><Sidebar items={items} variant={variant} subtitle={subtitle} /></div>
      {open && <div className="fixed inset-0 z-40 bg-ink-bg/60 lg:hidden" onClick={() => setOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar items={items} variant={variant} subtitle={subtitle} onNavigate={() => setOpen(false)} />
        <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-[-44px] top-4 rounded-full bg-white p-2 shadow"><X size={18} /></button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink/10 bg-cream/90 px-4 backdrop-blur sm:px-8">
          <button className="rounded-lg p-2 hover:bg-ink/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <p className="hidden text-sm text-muted lg:block">{TITLES[variant]} area</p>
          <div className="flex items-center gap-3">
            <Link to={`${base}/notifications`} className="relative rounded-full p-2 text-ink-2 hover:bg-ink/5" aria-label={`Notifications (${count} unread)`}>
              <Bell size={20} strokeWidth={1.6} />
              {count > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-maroon px-1 text-[10px] font-medium text-white">{count > 9 ? '9+' : count}</span>}
            </Link>
            <Link to={variant === 'admin' ? '/admin/settings' : `${base}/${variant === 'customer' ? 'profile' : 'settings'}`} className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-ink/5">
              {user.profileImage ? <img src={imgUrl(user.profileImage)} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-maroon text-xs font-medium text-ivory">{initials(user.name)}</span>}
              <span className="hidden max-w-[140px] truncate text-sm text-ink sm:block">{user.name}</span>
            </Link>
            <button onClick={async () => { await logout(); nav('/'); }} className="rounded-full p-2 text-ink-2 hover:bg-ink/5" aria-label="Log out" title="Log out"><LogOut size={19} strokeWidth={1.6} /></button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-8"><Outlet context={{ unread: unread.data?.unread || 0 }} /></main>
      </div>
    </div>
  );
}
