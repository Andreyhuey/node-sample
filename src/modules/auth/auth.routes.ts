import { type CookieOptions, type Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../config';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validated } from '../../middleware/validated';
import { UnauthorizedError } from '../../errors';
import { loginSchema, registerSchema } from './auth.schemas';
import * as service from './auth.service';

export const authRouter = Router();

const REFRESH_COOKIE = 'refresh_token';

// httpOnly: page JavaScript can't read it, so an XSS bug can't steal it.
// sameSite strict: the browser won't send it on requests from other sites.
// path: only sent to /auth, not with every API call.
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/auth',
};

function sendSession(res: Response, session: service.Session, status = 200) {
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    ...cookieOptions,
    maxAge: config.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
  // The refresh token only travels in the cookie, never in the body.
  res.status(status).json({ accessToken: session.accessToken, user: session.user });
}

// Slows down password guessing: 10 attempts per 15 minutes per IP.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.NODE_ENV === 'test',
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try again later' },
    });
  },
});

authRouter.post(
  '/register',
  credentialLimiter,
  validated({ body: registerSchema }, async ({ body }, res) => {
    sendSession(res, await service.registerPatient(body), 201);
  }),
);

authRouter.post(
  '/login',
  credentialLimiter,
  validated({ body: loginSchema }, async ({ body }, res) => {
    sendSession(res, await service.login(body));
  }),
);

authRouter.post('/refresh', async (req, res) => {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  if (typeof token !== 'string') throw new UnauthorizedError('No refresh token');
  try {
    sendSession(res, await service.refresh(token));
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw err;
  }
});

authRouter.post('/logout', async (req, res) => {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  if (typeof token === 'string') await service.logout(token);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json(await service.getUser(currentUser(req).id));
});
