import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
import { Pool } from 'pg';

// Applies the SQL files in drizzle/ that haven't run yet. Unlike
// `drizzle-kit migrate`, this only needs production dependencies, so it can
// run inside the Docker image and before tests.
export async function runMigrations(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.resolve(__dirname, '../../drizzle'),
    });
  } finally {
    await pool.end();
  }
}

// `node dist/db/migrate.js` runs it directly.
if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  runMigrations(url)
    .then(() => console.log('Migrations applied'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
