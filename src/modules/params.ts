import { z } from 'zod';

// Every resource uses a UUID id. Parsing it up front turns a bad id into a
// 400 instead of a Postgres error.
export const idParam = z.object({ id: z.string().uuid() });
