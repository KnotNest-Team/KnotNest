import ApiError from './ApiError.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * validate({ field: { required, type: 'string'|'email'|'number'|'date'|'boolean'|'array',
 *   min, max, minLength, maxLength, oneOf: [] } })  -> express middleware on req.body
 */
export const validate = (rules) => (req, _res, next) => {
  const errors = {};
  for (const [field, r] of Object.entries(rules)) {
    let v = req.body[field];
    const empty = v === undefined || v === null || v === '';
    if (empty) { if (r.required) errors[field] = 'Required'; continue; }
    if (r.type === 'string' || r.type === 'email') {
      if (typeof v !== 'string') { errors[field] = 'Must be text'; continue; }
      v = v.trim(); req.body[field] = v;
      if (r.type === 'email' && !EMAIL.test(v)) errors[field] = 'Invalid email';
      else if (r.minLength && v.length < r.minLength) errors[field] = `At least ${r.minLength} characters`;
      else if (r.maxLength && v.length > r.maxLength) errors[field] = `At most ${r.maxLength} characters`;
    } else if (r.type === 'number') {
      const n = Number(v);
      if (Number.isNaN(n)) errors[field] = 'Must be a number';
      else if (r.min !== undefined && n < r.min) errors[field] = `Must be at least ${r.min}`;
      else if (r.max !== undefined && n > r.max) errors[field] = `Must be at most ${r.max}`;
      else req.body[field] = n;
    } else if (r.type === 'date') {
      if (Number.isNaN(Date.parse(v))) errors[field] = 'Invalid date';
    } else if (r.type === 'array' && !Array.isArray(v)) errors[field] = 'Must be a list';
    if (r.oneOf && !errors[field] && !r.oneOf.includes(v)) errors[field] = `Must be one of: ${r.oneOf.join(', ')}`;
  }
  if (Object.keys(errors).length) return next(ApiError.badRequest('Validation failed', errors));
  next();
};

/** Pick only allowed keys from an object (prevents mass-assignment of protected fields). */
export const pick = (obj, keys) => keys.reduce((o, k) => (obj[k] !== undefined ? { ...o, [k]: obj[k] } : o), {});

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const pageParams = (q, def = 12) => {
  const page = Math.max(1, parseInt(q.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit) || def));
  return { page, limit, skip: (page - 1) * limit };
};
