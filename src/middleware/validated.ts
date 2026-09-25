import type { Request, RequestHandler, Response } from 'express';
import { z, type ZodTypeAny } from 'zod';

type Schemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

// Parsed input, typed from the schemas. A part without a schema is `undefined`,
// so a handler can't accidentally read unvalidated input through it.
type Input<S extends Schemas> = {
  [K in keyof Schemas]-?: S[K] extends ZodTypeAny ? z.infer<S[K]> : undefined;
};

/**
 * Wraps a route handler so body, query and params are parsed with Zod first.
 * The handler receives the typed result, and a ZodError reaches the error
 * handler as a 400.
 *
 *   router.get('/:id', validated({ params: idParam }, async ({ params }, res) => {
 *     res.json(await getPatient(params.id)); // params.id is a string
 *   }));
 *
 * A wrapper is used instead of plain middleware because middleware can't
 * change the types of `req.body` or `req.query` that the next handler sees.
 */
export function validated<S extends Schemas>(
  schemas: S,
  handler: (input: Input<S>, res: Response, req: Request) => Promise<void> | void,
): RequestHandler {
  return async (req, res) => {
    const input = {
      body: schemas.body?.parse(req.body),
      query: schemas.query?.parse(req.query),
      params: schemas.params?.parse(req.params),
    } as Input<S>;
    await handler(input, res, req);
  };
}
