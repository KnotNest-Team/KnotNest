import axios from 'axios';

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || ''}/api`, timeout: 20000 });

const TOKEN_KEY = 'knotnest_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

api.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// An expired/invalid token anywhere sends the app back to login (AuthContext listens for this event).
api.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401 && getToken()) {
    setToken(null);
    window.dispatchEvent(new Event('knotnest:unauthorized'));
  }
  return Promise.reject(err);
});

const get = (url, params) => api.get(url, { params }).then((r) => r.data);
const post = (url, body, cfg) => api.post(url, body, cfg).then((r) => r.data);
const put = (url, body) => api.put(url, body).then((r) => r.data);
const del = (url) => api.delete(url).then((r) => r.data);

export const authApi = {
  register: (b) => post('/auth/register', b), login: (b) => post('/auth/login', b), me: () => get('/auth/me'), logout: () => post('/auth/logout'),
  updateMe: (b) => put('/auth/me', b), changePassword: (b) => put('/auth/password', b),
};
export const vendorApi = {
  list: (p) => get('/vendors', p), one: (id) => get(`/vendors/${id}`), compare: (ids) => get('/vendors/compare', { ids: ids.join(',') }),
  mine: () => get('/vendors/me/profile'), analytics: () => get('/vendors/me/analytics'),
  create: (b) => post('/vendors', b), update: (id, b) => put(`/vendors/${id}`, b), remove: (id) => del(`/vendors/${id}`),
};
export const categoryApi = { list: (p) => get('/categories', p), create: (b) => post('/categories', b), update: (id, b) => put(`/categories/${id}`, b), remove: (id) => del(`/categories/${id}`) };
export const locationApi = { list: (p) => get('/locations', p), create: (b) => post('/locations', b), update: (id, b) => put(`/locations/${id}`, b), remove: (id) => del(`/locations/${id}`) };
export const enquiryApi = { create: (b) => post('/enquiries', b), list: (p) => get('/enquiries', p), update: (id, b) => put(`/enquiries/${id}`, b), report: (id, reason) => post(`/enquiries/${id}/report`, { reason }) };
export const bookingApi = {
  create: (b) => post('/bookings', b), list: (p) => get('/bookings', p), update: (id, b) => put(`/bookings/${id}`, b),
  // flexible wedding bookings: the server prices every selection (the browser never sends prices)
  plan: () => get('/bookings/plan'), quote: (b) => post('/bookings/quote', b),
  availableVendors: (b) => post('/bookings/available-vendors', b), checkout: (b) => post('/bookings/checkout', b),
};
export const reviewApi = {
  create: (b) => post('/reviews', b), list: (p) => get('/reviews', p), forVendor: (id, p) => get(`/reviews/vendor/${id}`, p),
  moderate: (id, status) => put(`/reviews/${id}`, { status }), remove: (id) => del(`/reviews/${id}`),
  reply: (id, reply) => put(`/reviews/${id}/reply`, { reply }), report: (id) => put(`/reviews/${id}/report`),
};
export const weddingApi = {
  get: () => get('/wedding'), create: (b) => post('/wedding', b), update: (b) => put('/wedding', b), summary: () => get('/wedding/summary'),
  addTask: (b) => post('/wedding/checklist', b), updateTask: (id, b) => put(`/wedding/checklist/${id}`, b), deleteTask: (id) => del(`/wedding/checklist/${id}`),
  traditions: () => get('/wedding/traditions'), plan: (b) => post('/wedding/events/plan', b), applyPlan: (events) => post('/wedding/events/apply', { events }),
  rsvpPreview: () => get('/wedding/rsvp-preview'),
  addEvent: (b) => post('/wedding/events', b), updateEvent: (id, b) => put(`/wedding/events/${id}`, b), deleteEvent: (id) => del(`/wedding/events/${id}`),
};
export const guestApi = {
  list: () => get('/wedding/guests'), create: (b) => post('/wedding/guests', b), import: (guests, events) => post('/wedding/guests/import', { guests, events }),
  update: (id, b) => put(`/wedding/guests/${id}`, b), remove: (id) => del(`/wedding/guests/${id}`),
  send: (b = {}) => post('/wedding/invites/send', b), remind: () => post('/wedding/invites/remind'), preview: (p) => get('/wedding/invites/preview', p),
};
export const rsvpApi = { get: (token) => get(`/rsvp/${token}`), respond: (token, b) => post(`/rsvp/${token}`, b) };
export const paymentApi = { config: () => get('/payments/config'), order: (booking) => post('/payments/order', { booking }), verify: (b) => post('/payments/verify', b) };
export const chatApi = {
  list: () => get('/conversations'), start: (vendor) => post('/conversations', { vendor }),
  messages: (id, after) => get(`/conversations/${id}/messages`, after ? { after } : undefined), send: (id, text) => post(`/conversations/${id}/messages`, { text }),
  report: (id, reason) => post(`/conversations/${id}/report`, { reason }),
};
export const expenseApi = { list: () => get('/expenses'), create: (b) => post('/expenses', b), update: (id, b) => put(`/expenses/${id}`, b), remove: (id) => del(`/expenses/${id}`) };
export const favouriteApi = { list: () => get('/favourites'), toggle: (id) => post(`/favourites/${id}`) };
export const notificationApi = {
  list: () => get('/notifications'), read: (id) => put(`/notifications/${id}/read`), readAll: () => put('/notifications/read-all'), remove: (id) => del(`/notifications/${id}`),
};
export const contentApi = { home: () => get('/content/home'), contact: (b) => post('/contact', b) };
export const uploadApi = {
  upload: (kind, files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    return post(`/uploads/${kind}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((d) => d.urls);
  },
};
export const adminApi = {
  dashboard: () => get('/admin/dashboard'), reports: () => get('/admin/reports'),
  users: (p) => get('/admin/users', p), user: (id) => get(`/admin/users/${id}`), updateUser: (id, b) => put(`/admin/users/${id}`, b), deleteUser: (id) => del(`/admin/users/${id}`),
  vendors: (p) => get('/admin/vendors', p), moderateVendor: (id, action) => put(`/admin/vendors/${id}/moderate`, { action }),
  bookings: (p) => get('/admin/bookings', p), enquiries: (p) => get('/admin/enquiries', p),
  content: () => get('/admin/content'), updateContent: (b) => put('/admin/content', b),
  messages: () => get('/admin/messages'), deleteMessage: (id) => del(`/admin/messages/${id}`),
  safety: (p) => get('/admin/safety', p), openConversation: (id, reason) => post(`/admin/safety/conversations/${id}/open`, { reason }),
  resolveConversation: (id, resolution) => put(`/admin/safety/conversations/${id}/resolve`, { resolution }),
  openEnquiry: (id, reason) => post(`/admin/safety/enquiries/${id}/open`, { reason }), resolveEnquiry: (id, resolution) => put(`/admin/safety/enquiries/${id}/resolve`, { resolution }),
  audit: (p) => get('/admin/audit', p),
  bookingReviews: () => get('/admin/booking-reviews'),
  platformSettings: () => get('/admin/settings/platform'), updatePlatformSettings: (b) => put('/admin/settings/platform', b),
  bookingStats: () => get('/admin/booking-stats'),
};

export default api;
