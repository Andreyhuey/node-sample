import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, NotFoundError } from '../errors';

// Runs when no route matched.
export const notFound: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
};

// Postgres reports constraint violations with SQLSTATE codes. Drizzle wraps
// the driver error, so look at `cause` too.
function pgErrorCode(err: unknown): string | undefined {
  for (const e of [err, (err as { cause?: unknown })?.cause]) {
    const code = (e as { code?: unknown })?.code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return undefined;
}

// Express recognises error handlers by their four arguments, so `_next`
// must stay even though it is unused.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request is invalid',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  switch (pgErrorCode(err)) {
    case '23505': // unique_violation
      res
        .status(409)
        .json({ error: { code: 'CONFLICT', message: 'Resource already exists' } });
      return;
    case '23P01': // exclusion_violation (double-booked doctor)
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Doctor already has an appointment at that time',
        },
      });
      return;
    case '23503': // foreign_key_violation
      res.status(409).json({
        error: { code: 'CONFLICT', message: 'Resource is referenced by other records' },
      });
      return;
  }

  console.error(err);
  res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};
