import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import type { UserRole } from '../../db/schema';

// What every authenticated request knows about its caller, read from the
// access token without a database lookup.
export type AuthUser = {
  id: string;
  role: UserRole;
  doctorId: string | null;
  patientId: string | null;
};

type AccessClaims = Omit<AuthUser, 'id'> & { sub: string };

export function signAccessToken(user: AuthUser): string {
  const claims: AccessClaims = {
    sub: user.id,
    role: user.role,
    doctorId: user.doctorId,
    patientId: user.patientId,
  };
  return jwt.sign(claims, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: config.ACCESS_TOKEN_TTL_MINUTES * 60,
  });
}

// Throws if the token is missing, tampered with or expired.
export function verifyAccessToken(token: string): AuthUser {
  // Pinning the algorithm stops "alg: none" and algorithm-swap attacks.
  const claims = jwt.verify(token, config.JWT_SECRET, {
    algorithms: ['HS256'],
  }) as AccessClaims;
  return {
    id: claims.sub,
    role: claims.role,
    doctorId: claims.doctorId,
    patientId: claims.patientId,
  };
}

// Refresh tokens are random, not JWTs: they are looked up in the database
// anyway, which is what makes them revocable.
export function newRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
