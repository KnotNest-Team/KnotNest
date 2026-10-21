const ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

export const imgUrl = (p) => {
  if (!p) return '';
  if (/^https?:|^data:/.test(p) || p.startsWith('/assets')) return p;
  return `${ORIGIN}${p}`; // /uploads/... served by the API
};

export const inr = (n = 0) => '₹' + Number(n || 0).toLocaleString('en-IN');
export const inrShort = (n = 0) => {
  n = Number(n || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n % 1e7 ? 1 : 0)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n % 1e5 ? 1 : 0)} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n}`;
};
export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? new Date(d).toLocaleDateString('en-IN', opts) : '-');
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const daysUntil = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null);
export const initials = (s = '') => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
export const fieldErrors = (e) => e?.response?.data?.details || {};
export const cx = (...a) => a.filter(Boolean).join(' ');
export const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
