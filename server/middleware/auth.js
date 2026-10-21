import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const readToken = (req) => {
  const h = req.headers.authorization;
  return h && h.startsWith('Bearer ') ? h.slice(7) : null;
};

const load = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Your account has been suspended');
  return user;
};

export const authMiddleware = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized();
  try { req.user = await load(token); } catch (e) {
    if (e instanceof ApiError) throw e;
    throw ApiError.unauthorized('Session expired, please log in again');
  }
  next();
});

/** Attaches req.user when a valid token exists but never fails. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (token) { try { req.user = await load(token); } catch { /* ignore */ } }
  next();
});

const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(ApiError.forbidden());

export const adminMiddleware = requireRole('admin');
export const vendorMiddleware = requireRole('vendor');
export const customerMiddleware = requireRole('customer');
export const roles = requireRole;
