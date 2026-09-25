import { and, eq, gt, isNull } from 'drizzle-orm';
import { config } from '../../config';
import { db } from '../../db';
import { patients, refreshTokens, type User, users } from '../../db/schema';
import { UnauthorizedError } from '../../errors';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { burnPasswordCheck, hashPassword, verifyPassword } from './passwords';
import { type AuthUser, hashToken, newRefreshToken, signAccessToken } from './tokens';

export type Session = { accessToken: string; refreshToken: string; user: PublicUser };
export type PublicUser = Omit<User, 'passwordHash'>;

function toPublic({ passwordHash: _omit, ...user }: User): PublicUser {
  return user;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    role: user.role,
    doctorId: user.doctorId,
    patientId: user.patientId,
  };
}

async function startSession(user: User): Promise<Session> {
  const refreshToken = newRefreshToken();
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
  });
  return {
    accessToken: signAccessToken(toAuthUser(user)),
    refreshToken,
    user: toPublic(user),
  };
}

// Patients sign themselves up. The clinic record and the login account are
// created together, so neither exists without the other.
export async function registerPatient(input: RegisterInput): Promise<Session> {
  const { password, ...profile } = input;
  const passwordHash = await hashPassword(password);

  const user = await db.transaction(async (tx) => {
    const [patient] = await tx.insert(patients).values(profile).returning();
    const [created] = await tx
      .insert(users)
      .values({
        email: profile.email,
        passwordHash,
        role: 'patient',
        patientId: patient.id,
      })
      .returning();
    return created;
  });

  return startSession(user);
}

export async function login({ email, password }: LoginInput): Promise<Session> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    await burnPasswordCheck(password);
    throw new UnauthorizedError('Email or password is incorrect');
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new UnauthorizedError('Email or password is incorrect');
  }
  return startSession(user);
}

/**
 * Swaps a refresh token for a new access token and a new refresh token
 * (rotation). Each refresh token works once. If an already-used token comes
 * back, someone may have stolen it, so every session for that user is ended.
 */
export async function refresh(presented: string): Promise<Session> {
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(presented)));

  if (!stored) throw new UnauthorizedError('Refresh token is invalid');

  if (stored.revokedAt) {
    await revokeAllSessions(stored.userId);
    throw new UnauthorizedError('Refresh token was already used');
  }
  if (stored.expiresAt <= new Date()) {
    throw new UnauthorizedError('Refresh token has expired');
  }

  // Only one of two simultaneous refreshes with the same token can win.
  const [claimed] = await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.id, stored.id), isNull(refreshTokens.revokedAt)))
    .returning();
  if (!claimed) throw new UnauthorizedError('Refresh token was already used');

  const [user] = await db.select().from(users).where(eq(users.id, stored.userId));
  if (!user) throw new UnauthorizedError('Refresh token is invalid');
  return startSession(user);
}

export async function logout(presented: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.tokenHash, hashToken(presented)),
        isNull(refreshTokens.revokedAt),
      ),
    );
}

async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    );
}

export async function getUser(id: string): Promise<PublicUser> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw new UnauthorizedError();
  return toPublic(user);
}

// Used by the admin seed script and when an admin creates a doctor account.
export async function createUserAccount(values: {
  email: string;
  password: string;
  role: User['role'];
  doctorId?: string;
  patientId?: string;
}): Promise<PublicUser> {
  const [user] = await db
    .insert(users)
    .values({ ...values, passwordHash: await hashPassword(values.password) })
    .returning();
  return toPublic(user);
}
