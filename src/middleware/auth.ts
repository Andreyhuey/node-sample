import type { Request, RequestHandler } from 'express';
import type { UserRole } from '../db/schema';
import { ForbiddenError, UnauthorizedError } from '../errors';
import { type AuthUser, verifyAccessToken } from '../modules/auth/tokens';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

// Reads "Authorization: Bearer <token>" and sets req.user, or responds 401.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError();
  }
  try {
    req.user = verifyAccessToken(header.slice('Bearer '.length));
  } catch {
    throw new UnauthorizedError('Access token is invalid or expired');
  }
  next();
};

// Use after requireAuth: 403 unless the caller has one of the roles.
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
}

// The authenticated caller. Only call it behind requireAuth.
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
