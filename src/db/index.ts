import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config';
import * as schema from './schema';

// One pool for the whole process. Each query borrows a connection and
// returns it, instead of opening a new connection per request.
export const pool = new Pool({ connectionString: config.DATABASE_URL });

export const db = drizzle(pool, { schema });
export type Db = typeof db;
