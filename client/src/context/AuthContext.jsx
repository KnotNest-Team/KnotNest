import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, favouriteApi, getToken, setToken } from '../services/api';
import { useToast } from './ToastContext';
import { errMsg } from '../utils/format';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const homeFor = (role) => ({ admin: '/admin', vendor: '/vendor/dashboard', customer: '/customer/dashboard' }[role] || '/');

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(!!getToken());

  const loadFavourites = useCallback(async (u) => {
    if (u?.role !== 'customer') return setFavourites([]);
    try { setFavourites((await favouriteApi.list()).favourites.map((v) => v._id)); } catch { /* non-critical */ }
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) { setLoading(false); return null; }
    try {
      const { user: u } = await authApi.me();
      setUser(u); await loadFavourites(u); return u;
    } catch { setToken(null); setUser(null); return null; } finally { setLoading(false); }
  }, [loadFavourites]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const h = () => { setUser(null); setFavourites([]); toast.info('Session expired. Please log in again.'); };
    window.addEventListener('knotnest:unauthorized', h);
    return () => window.removeEventListener('knotnest:unauthorized', h);
  }, [toast]);

  const finish = async ({ token, user: u }) => { setToken(token); setUser(u); await loadFavourites(u); return u; };
  const login = async (body) => finish(await authApi.login(body));
  const register = async (body) => finish(await authApi.register(body));
  const logout = async () => { try { await authApi.logout(); } catch { /* ignore */ } setToken(null); setUser(null); setFavourites([]); };

  const toggleFavourite = async (vendorId) => {
    if (!user) return toast.info('Log in as a customer to save vendors');
    if (user.role !== 'customer') return toast.info('Only customers can save vendors');
    try {
      const { favourited, ids } = await favouriteApi.toggle(vendorId);
      setFavourites(ids.map(String));
      toast.success(favourited ? 'Saved to favourites' : 'Removed from favourites');
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refresh, favourites, toggleFavourite }}>
      {children}
    </AuthContext.Provider>
  );
}
